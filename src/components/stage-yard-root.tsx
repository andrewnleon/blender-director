"use client";

import { StageBootGate } from "@/components/stage-boot-gate";
import { OpenClawYard } from "@/components/openclaw-yard";

export function StageYardRoot() {
  return (
    <StageBootGate>
      <OpenClawYard />
    </StageBootGate>
  );
}
