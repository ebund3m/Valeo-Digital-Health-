import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types/user";

export function useRole() {
  const { role, loading } = useAuth();

  return {
    role,
    loading,
    isClient:  role === "client",
    isDoctor:  role === "doctor",
    isAdmin:   role === "admin",
    hasRole:   (r: Role) => role === r,
  };
}