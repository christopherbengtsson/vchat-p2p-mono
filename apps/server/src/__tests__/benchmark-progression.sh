#!/bin/bash

# Comprehensive Performance Benchmark Script
# Tests client scaling AND WebRTC signaling performance with ICE candidate progression
# Usage: ./benchmark-progression.sh [SERVER_URL] [SUPABASE_JWT_SECRET]
# Examples:
#   ./benchmark-progression.sh                                                    # localhost
#   ./benchmark-progression.sh https://vcat-service.rest your_jwt_secret         # deployed

SERVER_URL=${1:-"http://localhost:8000"}
SUPABASE_JWT_SECRET=${2:-$SUPABASE_JWT_SECRET}

# Determine environment type for results naming
if [[ "$SERVER_URL" == "http://localhost:8000" ]]; then
    ENV_TYPE="localhost"
else
    ENV_TYPE="deployed"
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_DIR="./benchmark-results"
RESULTS_FILE="${RESULTS_DIR}/${ENV_TYPE}_comprehensive_benchmark_${TIMESTAMP}.txt"

# Validate required environment variables
if [[ -z "$SUPABASE_JWT_SECRET" ]]; then
    echo "❌ Error: SUPABASE_JWT_SECRET is required"
    echo "Usage: ./benchmark-progression.sh [SERVER_URL] [SUPABASE_JWT_SECRET]"
    echo "Examples:"
    echo "  SUPABASE_JWT_SECRET=your_secret ./benchmark-progression.sh"
    echo "  ./benchmark-progression.sh https://vcat-service.rest your_jwt_secret"
    exit 1
fi

# Create results directory
mkdir -p "$RESULTS_DIR"

echo "🚀 Starting Comprehensive Performance Benchmark"
echo "=============================================================" | tee "$RESULTS_FILE"
echo "Environment: $ENV_TYPE" | tee -a "$RESULTS_FILE"
echo "Server URL: $SERVER_URL" | tee -a "$RESULTS_FILE"
echo "Test Type: Client Scaling + WebRTC Signaling Performance" | tee -a "$RESULTS_FILE"
echo "Timestamp: $(date)" | tee -a "$RESULTS_FILE"
echo "=============================================================" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

# Test configurations
CLIENT_LEVELS=(200 400 800)
ICE_LEVELS=(10 20 30)
ICE_DESCRIPTIONS=("Light (Simple Networks)" "Medium (Corporate/NAT)" "Heavy (Complex/Mobile)")

# Counter for test progression
test_count=0
total_tests=$((${#CLIENT_LEVELS[@]} * ${#ICE_LEVELS[@]}))

echo "📊 Test Matrix: ${#CLIENT_LEVELS[@]} client levels × ${#ICE_LEVELS[@]} ICE intensities = $total_tests total scenarios" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

for clients in "${CLIENT_LEVELS[@]}"; do
    echo "👥 CLIENT LOAD: $clients concurrent clients" | tee -a "$RESULTS_FILE"
    echo "================================================================" | tee -a "$RESULTS_FILE"
    echo "" | tee -a "$RESULTS_FILE"
    
    for i in "${!ICE_LEVELS[@]}"; do
        ice_candidates=${ICE_LEVELS[$i]}
        ice_desc=${ICE_DESCRIPTIONS[$i]}
        test_count=$((test_count + 1))
        
        echo "🔹 Test $test_count/$total_tests: $clients clients × $ice_candidates ICE candidates - $ice_desc" | tee -a "$RESULTS_FILE"
        echo "----------------------------------------" | tee -a "$RESULTS_FILE"
        
        # Calculate expected signaling load
        expected_pairs=$((clients / 2))
        expected_messages_per_pair=$((2 + ice_candidates)) # offer + answer + ICE candidates
        expected_total_messages=$((expected_pairs * expected_messages_per_pair))
        
        echo "📈 Expected Signaling Load:" | tee -a "$RESULTS_FILE"
        echo "   • $expected_pairs WebRTC pairs" | tee -a "$RESULTS_FILE"
        echo "   • ~$expected_total_messages total signaling messages" | tee -a "$RESULTS_FILE"
        echo "   • ~$((expected_total_messages / 30)) messages/second target" | tee -a "$RESULTS_FILE"
        echo "" | tee -a "$RESULTS_FILE"
        
        # Run the comprehensive test with signaling enabled
        SERVER_URL="$SERVER_URL" SUPABASE_JWT_SECRET="$SUPABASE_JWT_SECRET" SIGNALING_TEST=true ICE_CANDIDATES=$ice_candidates MAX_CLIENTS=$clients pnpm test:load 2>&1 | tee -a "$RESULTS_FILE"
        
        echo "" | tee -a "$RESULTS_FILE"
        echo "✅ Completed: $clients clients, $ice_candidates ICE candidates" | tee -a "$RESULTS_FILE"
        echo "========================================" | tee -a "$RESULTS_FILE"
        echo "" | tee -a "$RESULTS_FILE"
        
        # Recovery pause between tests
        if [ $test_count -lt $total_tests ]; then
            echo "⏱️  Waiting 15 seconds for system recovery..."
            sleep 15
        fi
    done
    
    echo "" | tee -a "$RESULTS_FILE"
done

# Generate comprehensive summary
echo "🎯 Comprehensive Performance Benchmark Completed!" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"
echo "📊 Benchmark Summary:" | tee -a "$RESULTS_FILE"
echo "   Environment: $ENV_TYPE" | tee -a "$RESULTS_FILE"
echo "   Server URL: $SERVER_URL" | tee -a "$RESULTS_FILE"
echo "   Client Loads: ${CLIENT_LEVELS[*]} concurrent users" | tee -a "$RESULTS_FILE"
echo "   ICE Intensities: ${ICE_LEVELS[*]} candidates per client" | tee -a "$RESULTS_FILE"
echo "   Total Scenarios: $total_tests test combinations" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"
echo "🔍 Key Performance Metrics Tested:" | tee -a "$RESULTS_FILE"
echo "   • Connection establishment latency" | tee -a "$RESULTS_FILE"
echo "   • Matchmaking efficiency and speed" | tee -a "$RESULTS_FILE"
echo "   • WebRTC signaling throughput (messages/sec)" | tee -a "$RESULTS_FILE"
echo "   • Signaling latency under various loads" | tee -a "$RESULTS_FILE"
echo "   • System stability at scale" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"
echo "💾 Results saved to: $RESULTS_FILE" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"
echo "🔄 Environment Comparison:" | tee -a "$RESULTS_FILE"
echo "   Localhost: SUPABASE_JWT_SECRET=your_secret ./benchmark-progression.sh" | tee -a "$RESULTS_FILE"
echo "   Deployed:  ./benchmark-progression.sh https://vcat-service.rest your_jwt_secret" | tee -a "$RESULTS_FILE"
echo "   Compare performance in benchmark-results/" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"