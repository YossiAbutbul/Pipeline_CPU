export type HoverSignalKey =
  | "pc"
  | "pcPlus4"
  | "constant4"
  | "instructionWord"
  | "rsValue"
  | "rtValue"
  | "imm16Value"
  | "signExtendedImmValue"
  | "aluInputA"
  | "aluInputB"
  | "aluResult";

export type HoveredSignalValues = Partial<Record<HoverSignalKey, string>>;

export const PATH_SIGNAL_MAP: Partial<Record<string, { key: HoverSignalKey; label: string }>> = {
  w_pc_to_imem: { key: "pc", label: "PC" },
  w_pc_to_adder_pc4: { key: "pc", label: "PC" },
  w_4_to_adder_pc4: { key: "constant4", label: "Constant 4" },
  w_adder_pc4_to_ifid: { key: "pcPlus4", label: "PC + 4" },
  w_imem_to_ifid: { key: "instructionWord", label: "Instruction" },
  w_regfile_rs2_to_idex: { key: "rsValue", label: "Read Data 1" },
  w_regfile_rs2_to_cmp_eq: { key: "rsValue", label: "Read Data 1" },
  w_regfile_rt2_to_idex: { key: "rtValue", label: "Read Data 2" },
  w_regfile_rt2_to_cmp_eq: { key: "rtValue", label: "Read Data 2" },
  w_16bit_imm_to_signext: { key: "imm16Value", label: "Immediate[15:0]" },
  w_signext_32bit_imm_to_idex: { key: "signExtendedImmValue", label: "Sign-Extended Immediate" },
  w_idex_rs3_to_mux_fwd_a: { key: "aluInputA", label: "ALU Input A" },
  w_mux_fwd_a_rs_to_alu_a: { key: "aluInputA", label: "ALU Input A" },
  w_idex_rt3_to_mux_fwd_b: { key: "aluInputB", label: "ALU Input B" },
  w_mux_fwd_b_to_mux_alusrc: { key: "aluInputB", label: "ALU Input B" },
  w_idex_32bit_imm_to_mux_alusrc: { key: "aluInputB", label: "ALU Input B" },
  w_mux_alusrc_to_alu_b: { key: "aluInputB", label: "ALU Input B" },
  w_alu_out_to_exmem: { key: "aluResult", label: "ALU Result" },
};
