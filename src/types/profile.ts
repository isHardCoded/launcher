export type Profile = {
  id: number;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  birthDate: string | null;    
  avatarUrl: string | null;    
  createdAtUtc: string | null; 
};

export type UpdateProfileRequest = {
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  birthDate: string | null;
};
