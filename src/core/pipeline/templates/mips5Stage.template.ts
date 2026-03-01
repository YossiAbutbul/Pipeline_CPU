import type { DiagramTemplate } from "../diagramTypes";

export const MIPS_5_STAGE_BASE: DiagramTemplate = {
  id: "mips-5-stage-base",
  name: "MIPS 5-stage base pipeline",
  meta: { stages: ["IF", "ID", "EX", "MEM", "WB"] },
  nodes: [
    // Stage columns (anchors)
    { id: "stage-IF", kind: "stage", label: "IF", layout: { position: { x: 0, y: 0 }, size: { w: 220, h: 800 } } },
    { id: "stage-ID", kind: "stage", label: "ID", layout: { position: { x: 240, y: 0 }, size: { w: 220, h: 800 } } },
    { id: "stage-EX", kind: "stage", label: "EX", layout: { position: { x: 480, y: 0 }, size: { w: 220, h: 800 } } },
    { id: "stage-MEM", kind: "stage", label: "MEM", layout: { position: { x: 720, y: 0 }, size: { w: 220, h: 800 } } },
    { id: "stage-WB", kind: "stage", label: "WB", layout: { position: { x: 960, y: 0 }, size: { w: 220, h: 800 } } },

    // Pipeline regs
    { id: "ifid", kind: "pipeline_reg", label: "IF/ID", layout: { position: { x: 210, y: 120 }, size: { w: 40, h: 520 } } },
    { id: "idex", kind: "pipeline_reg", label: "ID/EX", layout: { position: { x: 450, y: 120 }, size: { w: 40, h: 520 } } },
    { id: "exmem", kind: "pipeline_reg", label: "EX/MEM", layout: { position: { x: 690, y: 120 }, size: { w: 40, h: 520 } } },
    { id: "memwb", kind: "pipeline_reg", label: "MEM/WB", layout: { position: { x: 930, y: 120 }, size: { w: 40, h: 520 } } },

    // A few core blocks (placeholders for now)
    { id: "pc", kind: "block", label: "PC", layout: { position: { x: 40, y: 140 }, size: { w: 100, h: 60 } } },
    { id: "imem", kind: "block", label: "Instruction\nMemory", layout: { position: { x: 40, y: 240 }, size: { w: 160, h: 120 } } },
    { id: "regfile", kind: "block", label: "Registers", layout: { position: { x: 290, y: 220 }, size: { w: 160, h: 160 } } },
    { id: "alu", kind: "block", label: "ALU", layout: { position: { x: 540, y: 260 }, size: { w: 140, h: 120 } } },
    { id: "dmem", kind: "block", label: "Data\nMemory", layout: { position: { x: 760, y: 260 }, size: { w: 160, h: 140 } } },
  ],
  edges: [],
};