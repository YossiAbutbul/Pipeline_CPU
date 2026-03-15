import type { HoverSignalKey } from "@/features/pipelineCanvas/pipelineHoverMap";
import type { PlacedComponent } from "./usePendingComponentPlacement";
import { getComponentValuePreview } from "./componentValueModel";

export const SUPPORTED_COMPONENT_SIGNAL_KEYS = new Set<HoverSignalKey>([
  "imm16Value",
  "signExtendedImmValue",
  "idBranchBasePcPlus4",
  "idBranchOffsetShifted",
  "idBranchTarget",
  "nextPcSelected",
  "rsValue",
  "rtValue",
  "exRawAValue",
  "exRawBValue",
  "exSignExtendedImmValue",
  "aluInputA",
  "aluInputB",
  "aluResult",
  "memStageAluResultToMemwb",
  "wbLatchedAluResult",
  "exForwardBValue",
  "memoryAddress",
  "memoryWriteData",
  "memoryReadData",
  "writeBackValue",
  "memForwardValue",
]);

export type ActiveSignalComponent = {
  componentLabel: string;
  signalKey: HoverSignalKey;
  pathId: string;
} | null;

const BRANCH_COMPARE_RS_PATHS = new Set(["w_regfile_rs2_to_cmp_eq"]);
const BRANCH_COMPARE_RT_PATHS = new Set(["w_regfile_rt2_to_cmp_eq"]);
const BRANCH_BASE_PATHS = new Set(["w_ifid_to_adder_branch_id"]);
const BRANCH_IMMEDIATE_PATHS = new Set(["w_16bit_imm_to_signext", "w_32bit_imm_to_shiftleft2_id"]);
const BRANCH_SHIFTED_OFFSET_PATHS = new Set(["w_shiftleft2_id_to_adder_branch_id"]);
const BRANCH_TARGET_PATHS = new Set(["w_adder_branch_id_to_mux_pcsrc"]);
const NEXT_PC_SELECTED_PATHS = new Set(["w_mux_pcsrc_to_pc"]);
const EX_SOURCE_A_PATHS = new Set(["w_regfile_rs2_to_idex", "w_idex_rs3_to_mux_fwd_a", "w_mux_fwd_a_rs_to_alu_a"]);
const EX_SOURCE_B_PATHS = new Set(["w_regfile_rt2_to_idex", "w_idex_rt3_to_mux_fwd_b", "w_mux_fwd_b_to_mux_alusrc"]);
const EX_IMMEDIATE_PATHS = new Set([
  "w_16bit_imm_to_signext",
  "w_signext_32bit_imm_to_idex",
  "w_idex_32bit_imm_to_mux_alusrc",
]);
const ALU_INPUT_B_PATHS = new Set(["w_mux_alusrc_to_alu_b"]);
const ALU_RESULT_PATHS = new Set([
  "w_alu_out_to_exmem",
  "w_exmem_alu_out4_to_dmem",
  "w_exmem_alu_out_to_mux_fwd_a",
  "w_exmem_alu_out4_to_mux_fwd_b",
]);
const MEMWB_ALU_RESULT_PATHS = new Set(["w_exmem_alu_out_to_memwb", "w_exmem_aluout_to_mux_memtoreg"]);
const MEMORY_ADDRESS_PATHS = new Set(["w_exmem_alu_out4_to_dmem"]);
const MEMORY_WRITE_DATA_PATHS = new Set(["w_fwd_b_exmem_to_dmem", "w_mux_fwd_b_to_exmem"]);
const MEMORY_READ_DATA_PATHS = new Set(["w_dmem_readdata_to_mux_memtoreg", "w_dmem_aluout_to_memwb"]);
const WRITEBACK_VALUE_PATHS = new Set(["w_mem_to_regfile", "w_wb_value_to_mux_fwd_a", "w_mux_memtoreg_to_mux_fwd_b"]);

function isPathInGroup(activeComponent: ActiveSignalComponent, group: Set<string>) {
  return Boolean(activeComponent && group.has(activeComponent.pathId));
}

export function canAttachComponentToSignal(signalKey: HoverSignalKey | null | undefined) {
  return signalKey ? SUPPORTED_COMPONENT_SIGNAL_KEYS.has(signalKey) : false;
}

export function getActiveSignalComponent(placedComponents: PlacedComponent[]): ActiveSignalComponent {
  const placedComponent = placedComponents[0];
  if (!placedComponent?.signalKey || !canAttachComponentToSignal(placedComponent.signalKey)) {
    return null;
  }

  return {
    componentLabel: placedComponent.label,
    signalKey: placedComponent.signalKey,
    pathId: placedComponent.pathId,
  };
}

export function applySignalComponentToNumber(
  activeComponent: ActiveSignalComponent,
  signalKey: HoverSignalKey,
  value: number | null,
): number | null {
  if (!activeComponent || activeComponent.signalKey !== signalKey || value === null) {
    return value;
  }

  const preview = getComponentValuePreview(activeComponent.componentLabel, String(value >>> 0));
  if (!preview) {
    return value;
  }

  return Number.parseInt(preview.afterHex.slice(2), 16) >>> 0;
}

export function applySignalComponentToPathNumber(
  activeComponent: ActiveSignalComponent,
  pathGroup:
    | "branchRs"
    | "branchRt"
    | "branchBase"
    | "branchImm"
    | "branchOffsetShifted"
    | "branchTarget"
    | "nextPcSelected"
    | "exA"
    | "exB"
    | "imm"
    | "aluB"
    | "aluResult"
    | "memWbAluResult"
    | "memoryAddress"
    | "memoryWriteData"
    | "memoryReadData"
    | "writeBackValue",
  value: number | null,
) {
  const groups = {
    branchRs: BRANCH_COMPARE_RS_PATHS,
    branchRt: BRANCH_COMPARE_RT_PATHS,
    branchBase: BRANCH_BASE_PATHS,
    branchImm: BRANCH_IMMEDIATE_PATHS,
    branchOffsetShifted: BRANCH_SHIFTED_OFFSET_PATHS,
    branchTarget: BRANCH_TARGET_PATHS,
    nextPcSelected: NEXT_PC_SELECTED_PATHS,
    exA: EX_SOURCE_A_PATHS,
    exB: EX_SOURCE_B_PATHS,
    imm: EX_IMMEDIATE_PATHS,
    aluB: ALU_INPUT_B_PATHS,
    aluResult: ALU_RESULT_PATHS,
    memWbAluResult: MEMWB_ALU_RESULT_PATHS,
    memoryAddress: MEMORY_ADDRESS_PATHS,
    memoryWriteData: MEMORY_WRITE_DATA_PATHS,
    memoryReadData: MEMORY_READ_DATA_PATHS,
    writeBackValue: WRITEBACK_VALUE_PATHS,
  } as const;

  if (!isPathInGroup(activeComponent, groups[pathGroup]) || value === null) {
    return value;
  }

  const preview = getComponentValuePreview(activeComponent!.componentLabel, String(value >>> 0));
  if (!preview) {
    return value;
  }

  return Number.parseInt(preview.afterHex.slice(2), 16) >>> 0;
}

export function applySignalComponentToHex(
  activeComponent: ActiveSignalComponent,
  signalKey: HoverSignalKey,
  value: string | undefined,
): string | undefined {
  if (!activeComponent || activeComponent.signalKey !== signalKey || !value) {
    return value;
  }

  return getComponentValuePreview(activeComponent.componentLabel, value)?.afterHex ?? value;
}
