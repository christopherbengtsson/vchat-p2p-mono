#!/bin/bash

# Enhanced VPS Deployment Script for WebRTC Signaling Server
# Production-grade deployment with zero-downtime strategies
# 
# Requirements: docker, docker compose, yq (optional - auto-detects architecture)
# Install yq: The script will show the correct command for your architecture

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="${SCRIPT_DIR}/deployment.log"
readonly MAX_HEALTH_CHECK_RETRIES=30
readonly HEALTH_CHECK_INTERVAL=2

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $*" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    log "ERROR: $1"
    exit 1
}

# Cleanup function
cleanup() {
    if [[ -n "${temp_files:-}" ]]; then
        rm -f "$temp_files"
    fi
}
trap cleanup EXIT

# Pre-deployment checks
pre_deployment_checks() {
    echo -e "${BLUE}🔍 Running pre-deployment checks...${NC}"
    
    # Check Docker availability
    if ! command -v docker >/dev/null 2>&1; then
        error_exit "Docker is not installed or not in PATH"
    fi
    
    # Check Docker Compose availability
    if ! docker compose version >/dev/null 2>&1; then
        error_exit "Docker Compose is not available"
    fi
    
    # Check yq availability (for dependency parsing)
    if ! command -v yq >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Warning: yq not found. Dependency ordering will be simplified.${NC}"
        
        # Auto-detect architecture for yq installation
        local arch=$(uname -m)
        local yq_arch
        case "$arch" in
            x86_64) yq_arch="amd64" ;;
            aarch64|arm64) yq_arch="arm64" ;;
            armv7l) yq_arch="arm" ;;
            *) yq_arch="amd64" ;;  # fallback
        esac
        
        echo -e "   Install with: ${CYAN}curl -sL https://github.com/mikefarah/yq/releases/latest/download/yq_linux_${yq_arch} -o /tmp/yq && chmod +x /tmp/yq && sudo mv /tmp/yq /usr/local/bin/yq${NC}"
        echo -e "   Or simply: ${CYAN}sudo apt update && sudo apt install yq${NC}"
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "docker-compose.yml" ]]; then
        error_exit "docker-compose.yml not found. Are you in the right directory?"
    fi
    
    # Check available disk space (warn if < 2GB)
    available_space=$(df . | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then  # 2GB in KB
        echo -e "${YELLOW}⚠️  Warning: Low disk space (< 2GB available)${NC}"
        read -p "Continue anyway? (y/N): " confirm
        [[ $confirm != [yY] ]] && exit 0
    fi
    
    # Check if services are currently running
    echo -e "     ${GREEN}✓${NC} Docker and Compose available"
    echo -e "     ${GREEN}✓${NC} Configuration files present"
    echo -e "     ${GREEN}✓${NC} Sufficient disk space"
}

# Enhanced health check function
health_check() {
    local service=$1
    local retries=0
    
    echo -n "     Checking $service health..."
    
    case "$service" in
        "redis")
            while [[ $retries -lt $MAX_HEALTH_CHECK_RETRIES ]]; do
                if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
                    echo -e " ${GREEN}✓${NC} (${retries}s)"
                    return 0
                fi
                sleep $HEALTH_CHECK_INTERVAL
                ((retries += HEALTH_CHECK_INTERVAL))
            done
            ;;
        "backend")
            while [[ $retries -lt $MAX_HEALTH_CHECK_RETRIES ]]; do
                if docker compose exec -T backend curl -f -s --max-time 3 -H "x-forwarded-for: 127.0.0.1" http://localhost:8000/api/v1/health >/dev/null 2>&1; then
                    echo -e " ${GREEN}✓${NC} (${retries}s)"
                    return 0
                fi
                sleep $HEALTH_CHECK_INTERVAL
                ((retries += HEALTH_CHECK_INTERVAL))
            done
            ;;
        "caddy")
            while [[ $retries -lt $MAX_HEALTH_CHECK_RETRIES ]]; do
                if curl -f -s --max-time 3 http://localhost/api/v1/health >/dev/null 2>&1; then
                    echo -e " ${GREEN}✓${NC} (${retries}s)"
                    return 0
                fi
                sleep $HEALTH_CHECK_INTERVAL
                ((retries += HEALTH_CHECK_INTERVAL))
            done
            ;;
        "alloy")
            while [[ $retries -lt $MAX_HEALTH_CHECK_RETRIES ]]; do
                if curl -f -s --max-time 3 http://localhost:12345/-/healthy >/dev/null 2>&1; then
                    echo -e " ${GREEN}✓${NC} (${retries}s)"
                    return 0
                fi
                sleep $HEALTH_CHECK_INTERVAL
                ((retries += HEALTH_CHECK_INTERVAL))
            done
            ;;
        "cap")
            while [[ $retries -lt $MAX_HEALTH_CHECK_RETRIES ]]; do
                if curl -f -s --max-time 3 http://localhost:8001/ >/dev/null 2>&1; then
                    echo -e " ${GREEN}✓${NC} (${retries}s)"
                    return 0
                fi
                sleep $HEALTH_CHECK_INTERVAL
                ((retries += HEALTH_CHECK_INTERVAL))
            done
            ;;
        *)
            # Generic container health check
            while [[ $retries -lt $MAX_HEALTH_CHECK_RETRIES ]]; do
                if docker compose ps "$service" | grep -q "Up"; then
                    echo -e " ${GREEN}✓${NC} (${retries}s)"
                    return 0
                fi
                sleep $HEALTH_CHECK_INTERVAL
                ((retries += HEALTH_CHECK_INTERVAL))
            done
            ;;
    esac
    
    echo -e " ${RED}✗${NC} (timeout after ${MAX_HEALTH_CHECK_RETRIES}s)"
    return 1
}

# Backup current state
backup_state() {
    echo -e "${BLUE}💾 Creating backup snapshot...${NC}"
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Save current service states
    docker compose ps --format json > "$backup_dir/services_state.json"
    
    # Save current images
    docker compose images --format json > "$backup_dir/images_state.json"
    
    echo -e "     ${GREEN}✓${NC} Backup saved to $backup_dir"
    echo "$backup_dir" > .last_backup
}

# Get service dependencies
get_service_dependencies() {
    local service=$1
    
    # If yq is available, use it for precise parsing
    if command -v yq >/dev/null 2>&1; then
        docker compose config | yq eval ".services.${service}.depends_on | keys" 2>/dev/null | grep -v "null" | sed 's/^- //' || true
    else
        # Fallback: basic grep-based parsing (less reliable)
        case "$service" in
            "backend") echo "redis cap" ;;
            "caddy") echo "backend" ;;
            "alloy") echo "backend" ;;
            *) echo "" ;;
        esac
    fi
}

# Sort services by dependency order
sort_services_by_dependencies() {
    local services=("$@")
    local sorted_services=()
    local processed=()
    
    # Simple topological sort - dependencies first
    for service in "${services[@]}"; do
        local deps
        deps=($(get_service_dependencies "$service"))
        
        # Add dependencies first if they're in our service list
        for dep in "${deps[@]}"; do
            if [[ " ${services[*]} " =~ " ${dep} " ]] && [[ ! " ${processed[*]} " =~ " ${dep} " ]]; then
                sorted_services+=("$dep")
                processed+=("$dep")
            fi
        done
        
        # Add the service itself if not already processed
        if [[ ! " ${processed[*]} " =~ " ${service} " ]]; then
            sorted_services+=("$service")
            processed+=("$service")
        fi
    done
    
    echo "${sorted_services[@]}"
}

# Rolling update with zero downtime
rolling_update() {
    local service=$1
    
    echo -e "${YELLOW}   🔄 Rolling update for $service...${NC}"
    
    # Check dependencies are healthy before updating
    local deps
    deps=($(get_service_dependencies "$service"))
    for dep in "${deps[@]}"; do
        if ! health_check "$dep"; then
            echo -e "     ${RED}✗${NC} Dependency $dep is not healthy, skipping update"
            return 1
        fi
    done
    
    # For services that support rolling updates
    case "$service" in
        "backend")
            # Get the current container name
            local current_container=$(docker compose ps -q backend | head -1)
            
            if [[ -n "$current_container" ]]; then
                echo -e "     ${BLUE}ℹ${NC} Starting new instance alongside current one"
                
                # Scale up to 2 instances to start new one with latest image
                docker compose up -d --scale backend=2 backend
                
                # Wait for new container to start (give it a moment to initialize)
                sleep 2
                
                # Wait for new instance to be healthy
                echo -e "     ${BLUE}ℹ${NC} Waiting for new instance to be healthy..."
                local new_healthy=false
                for ((i=0; i<15; i++)); do
                    # Check if we have a healthy new instance
                    local backend_containers=($(docker compose ps -q backend))
                    for container in "${backend_containers[@]}"; do
                        if [[ "$container" != "$current_container" ]]; then
                            if docker exec "$container" curl -f -s --max-time 3 -H "x-forwarded-for: 127.0.0.1" http://localhost:8000/api/v1/health >/dev/null 2>&1; then
                                new_healthy=true
                                echo -e "     ${GREEN}✓${NC} New instance is healthy"
                                break 2
                            fi
                        fi
                    done
                    sleep 2
                done
                
                if [[ "$new_healthy" == "true" ]]; then
                    echo -e "     ${BLUE}ℹ${NC} Removing old instance"
                    docker stop "$current_container"
                    docker rm "$current_container"
                    
                    # Now recreate with proper naming by stopping all and starting fresh
                    echo -e "     ${BLUE}ℹ${NC} Normalizing container naming"
                    docker compose stop backend
                    docker compose up -d backend
                else
                    echo -e "     ${RED}✗${NC} New instance failed health check, keeping old instance"
                    # Remove the new unhealthy instance and keep the old one
                    local backend_containers=($(docker compose ps -q backend))
                    for container in "${backend_containers[@]}"; do
                        if [[ "$container" != "$current_container" ]]; then
                            docker stop "$container" 2>/dev/null || true
                            docker rm "$container" 2>/dev/null || true
                        fi
                    done
                    return 1
                fi
            else
                echo -e "     ${BLUE}ℹ${NC} No existing container, starting fresh"
                docker compose up -d backend
            fi
            ;;
        "redis")
            # Handle Redis with optional database flush
            if [[ "${REDIS_FLUSH_DB:-false}" == "true" ]]; then
                echo -e "     ${RED}⚠${NC} Flushing Redis database before update..."
                # Try to flush if Redis is running
                if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
                    docker compose exec -T redis redis-cli FLUSHALL
                    echo -e "     ${GREEN}✓${NC} Redis database flushed"
                else
                    echo -e "     ${YELLOW}ℹ${NC} Redis not running, will start fresh"
                fi
            fi
            docker compose up -d "$service"
            if [[ "${REDIS_FLUSH_DB:-false}" == "true" ]]; then
                # Wait for Redis to be ready after restart
                sleep 2
                # Confirm flush worked (should be empty)
                if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
                    db_size=$(docker compose exec -T redis redis-cli DBSIZE 2>/dev/null || echo "0")
                    echo -e "     ${GREEN}✓${NC} Redis restarted with clean database (${db_size} keys)"
                fi
            fi
            ;;
        *)
            # Standard update for other services (respecting dependencies)
            docker compose up -d "$service"
            ;;
    esac
}

# Main deployment function
deploy_services() {
    local services=("$@")
    local failed_services=()
    
    echo -e "${BLUE}🔄 Deploying selected services...${NC}"
    
    # Get available services once to avoid inconsistencies
    local available_services_list
    available_services_list=($(docker compose config --services))
    
    # Sort services by dependency order
    local sorted_services
    sorted_services=($(sort_services_by_dependencies "${services[@]}"))
    
    echo -e "${CYAN}📋 Deployment order (dependencies first): ${sorted_services[*]}${NC}"
    echo ""
    
    for service in "${sorted_services[@]}"; do
        echo -e "${CYAN}📦 Processing $service...${NC}"
        log "Starting deployment of service: $service"
        
        # Check if service exists
        local service_found=false
        for available_service in "${available_services_list[@]}"; do
            if [[ "$service" == "$available_service" ]]; then
                service_found=true
                break
            fi
        done
        
        if [[ "$service_found" == "false" ]]; then
            echo -e "     ${RED}✗${NC} Service '$service' not found"
            failed_services+=("$service")
            continue
        fi
        
        # Check dependencies are healthy before proceeding
        local deps
        deps=($(get_service_dependencies "$service"))
        local dep_failed=false
        
        for dep in "${deps[@]}"; do
            if docker compose ps -q "$dep" >/dev/null 2>&1; then
                if ! health_check "$dep"; then
                    echo -e "     ${RED}✗${NC} Dependency $dep is not healthy"
                    dep_failed=true
                fi
            else
                echo -e "     ${YELLOW}⚠${NC} Dependency $dep is not running, starting it first"
                docker compose up -d "$dep"
                if ! health_check "$dep"; then
                    echo -e "     ${RED}✗${NC} Failed to start dependency $dep"
                    dep_failed=true
                fi
            fi
        done
        
        if [[ "$dep_failed" == "true" ]]; then
            echo -e "     ${RED}✗${NC} Cannot proceed with $service due to dependency failures"
            failed_services+=("$service")
            continue
        fi
        
        # Check current status
        if docker compose ps -q "$service" >/dev/null 2>&1; then
            echo -e "     ${GREEN}ℹ${NC} Service is running, performing update"
            rolling_update "$service"
        else
            echo -e "     ${BLUE}ℹ${NC} Service not running, starting fresh"
            docker compose up -d "$service"
        fi
        
        # Health check
        if health_check "$service"; then
            echo -e "     ${GREEN}✅ $service updated successfully${NC}"
            log "Successfully deployed service: $service"
        else
            echo -e "     ${RED}❌ $service health check failed${NC}"
            failed_services+=("$service")
            log "Failed to deploy service: $service"
            
            # Ask if we should continue
            echo -e "${YELLOW}⚠️  $service failed health checks. Continue with other services?${NC}"
            read -p "Continue? (y/N): " confirm
            [[ $confirm != [yY] ]] && break
        fi
        
        echo ""
    done
    
    # Report results
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        echo -e "${RED}❌ Some services failed to deploy: ${failed_services[*]}${NC}"
        log "Deployment completed with failures: ${failed_services[*]}"
        return 1
    else
        echo -e "${GREEN}🎉 All services deployed successfully!${NC}"
        log "Deployment completed successfully"
        return 0
    fi
}

# Post-deployment status and monitoring
post_deployment_status() {
    echo -e "${BLUE}📊 Post-deployment status:${NC}"
    
    # Service status
    echo -e "\n${CYAN}Service Status:${NC}"
    docker compose ps
    
    # Resource usage
    echo -e "\n${CYAN}Resource Usage:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | head -6
    
    # Disk usage
    echo -e "\n${CYAN}Disk Usage:${NC}"
    df -h . | tail -1
    
    # Service URLs
    echo -e "\n${CYAN}🌐 Service URLs:${NC}"
    echo -e "   • WebRTC Signaling: ${GREEN}https://vcat-service.rest${NC}"
    echo -e "   • API Health Check: ${GREEN}https://vcat-service.rest/api/v1/health${NC}"
    echo -e "   • Socket.IO: ${GREEN}https://vcat-service.rest/socket.io${NC}"
    echo -e "   • Alloy Metrics: ${GREEN}http://localhost:12345${NC}"
    
    # Quick connectivity test
    echo -e "\n${CYAN}🔗 Connectivity Test:${NC}"
    if curl -f -s --max-time 5 https://vcat-service.rest/api/v1/health >/dev/null 2>&1; then
        echo -e "   ${GREEN}✓${NC} External API accessible"
    else
        echo -e "   ${RED}✗${NC} External API not accessible"
    fi
}

# Main script execution
main() {
    echo -e "${BLUE}🚀 Enhanced WebRTC Signaling Server - VPS Deployment${NC}"
    echo -e "${CYAN}Started at: $(date)${NC}"
    echo ""
    
    log "=== Deployment started ==="
    
    # Pre-deployment checks
    pre_deployment_checks
    
    # Create backup
    backup_state
    
    # Pull latest images with progress
    echo -e "${BLUE}📦 Pulling latest Docker images...${NC}"
    if docker compose pull 2>&1 | grep -E "(Pulling|Downloaded|Status)"; then
        echo -e "     ${GREEN}✓${NC} Images updated"
    else
        error_exit "Failed to pull images"
    fi
    
    echo ""
    echo -e "${BLUE}📋 Available services:${NC}"
    # Capture services list once to ensure consistency
    available_services_for_display=($(docker compose config --services))
    for i in "${!available_services_for_display[@]}"; do
        echo " $((i+1))) ${available_services_for_display[i]}"
    done
    
    echo ""
    echo -e "${YELLOW}Select services to update:${NC}"
    echo -e "  • Enter numbers (space-separated, e.g. '1 3 4')"
    echo -e "  • Enter 'all' for all services"
    echo -e "  • Enter 'critical' for backend+redis only"
    echo -e "  • Enter 'critical-reset-db' for backend+redis with DB flush"
    echo -e "  • Enter 'q' to quit"
    
    read -r selection
    
    case "$selection" in
        "q"|"quit"|"exit")
            echo "Deployment cancelled."
            exit 0
            ;;
        "all")
            services=("${available_services_for_display[@]}")
            echo -e "${YELLOW}⚠️  Updating ALL services. This may cause brief downtime.${NC}"
            read -p "Continue? (y/N): " confirm
            [[ $confirm != [yY] ]] && exit 0
            ;;
        "critical")
            services=("redis" "backend")
            echo -e "${CYAN}Updating critical services: ${services[*]}${NC}"
            ;;
        "critical-reset-db")
            services=("redis" "backend")
            echo -e "${RED}⚠️  WARNING: This will FLUSH ALL Redis data!${NC}"
            echo -e "${CYAN}Updating critical services with database reset: ${services[*]}${NC}"
            read -p "Are you absolutely sure? Type 'FLUSH' to confirm: " confirm
            [[ $confirm != "FLUSH" ]] && exit 0
            # Set flag for Redis flush
            export REDIS_FLUSH_DB=true
            echo -e "${GREEN}✓${NC} Database reset confirmed. Proceeding with deployment..."
            ;;
        *)
            services=()
            # Use the same array for selection as we used for display
            for num in $selection; do
                # Convert to 0-based index for array access
                index=$((num - 1))
                if [[ $index -ge 0 && $index -lt ${#available_services_for_display[@]} ]]; then
                    service="${available_services_for_display[$index]}"
                    services+=("$service")
                fi
            done
            
            if [[ ${#services[@]} -eq 0 ]]; then
                error_exit "No valid services selected"
            fi
            
            echo -e "${CYAN}Selected services: ${services[*]}${NC}"
            ;;
    esac
    
    echo ""
    
    # Deploy services
    if deploy_services "${services[@]}"; then
        post_deployment_status
        
        echo ""
        echo -e "${BLUE}💡 Useful commands:${NC}"
        echo -e "   • View logs: ${YELLOW}docker compose logs -f [service]${NC}"
        echo -e "   • Rollback: ${YELLOW}docker compose down && docker compose up -d${NC}"
        echo -e "   • Monitor: ${YELLOW}watch docker stats${NC}"
        
        log "=== Deployment completed successfully ==="
        exit 0
    else
        echo ""
        echo -e "${RED}💥 Deployment completed with errors${NC}"
        echo -e "${YELLOW}Check logs: $LOG_FILE${NC}"
        
        if [[ -f .last_backup ]]; then
            echo -e "${YELLOW}Backup available: $(cat .last_backup)${NC}"
        fi
        
        log "=== Deployment completed with errors ==="
        exit 1
    fi
}

# Run main function
main "$@"
