import { createFileRoute } from "@tanstack/react-router";
import { CaoGame } from "@/components/cao-game";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <CaoGame />;
}
