export interface MatchApplication {
  id: string;
  matchId: string;
  userName: string;
  createdAt: string;
}

export interface CreateApplicationInput {
  matchId: string;
  userName: string;
}
