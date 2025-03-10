interface Description {
  description: RTCSessionDescriptionInit | null;
}
interface Candidate {
  candidate: RTCIceCandidateInit | null;
}

function isDescription(
  message: Description | Candidate,
): message is Description {
  return (
    (message as Description).description !== null &&
    (message as Description).description !== undefined
  );
}

function isCandidate(message: Description | Candidate): message is Candidate {
  return (
    (message as Candidate).candidate !== null &&
    (message as Candidate).candidate !== undefined
  );
}

export type PeerMessage = Description | Candidate;

export const PeerMessage = {
  isDescription,
  isCandidate,
};
