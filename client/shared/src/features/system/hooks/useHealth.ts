import { useQuery } from "@tanstack/react-query";

import { systemApi } from "../api/systemApi";

export function useHealth() {
  return useQuery({
    queryKey: ["system", "health"],
    queryFn: systemApi.getHealth,
    refetchInterval: 10_000,
  });
}
