import { useState, useEffect } from "react";
import api from "../data/api";

export interface UserDto {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
}

let cache: UserDto[] | null = null;
let pending: Promise<UserDto[]> | null = null;

export function invalidateUsersCache() {
  cache = null;
  pending = null;
}

export function useUsers(): UserDto[] {
  const [users, setUsers] = useState<UserDto[]>(cache ?? []);

  useEffect(() => {
    let mounted = true;
    if (cache) {
      setUsers(cache);
      return () => { mounted = false; };
    }
    if (!pending) {
      pending = api
        .get("/Auth/users")
        .then((res) => {
          cache = (res.data.items ?? []) as UserDto[];
          pending = null;
          return cache;
        })
        .catch(() => {
          pending = null;
          return [] as UserDto[];
        });
    }
    pending?.then((data) => { if (mounted) setUsers(data); });
    return () => { mounted = false; };
  }, []);

  return users;
}
