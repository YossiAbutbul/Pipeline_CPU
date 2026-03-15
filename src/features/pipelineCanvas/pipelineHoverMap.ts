export type HoverSignalKey =
  | "pc"
  | "pcPlus4"
  | "constant4"
  | "nextPcSequential"
  | "nextPcSelected"
  | "exceptionVector"
  | "instructionWord"
  | "idInstructionWord"
  | "idRsRegister"
  | "idRtRegister"
  | "idRdRegister"
  | "rsValue"
  | "rtValue"
  | "imm16Value"
  | "signExtendedImmValue"
  | "idBranchBasePcPlus4"
  | "idBranchOffsetShifted"
  | "idBranchTarget"
  | "exRawAValue"
  | "exRawBValue"
  | "exSignExtendedImmValue"
  | "aluInputA"
  | "aluInputB"
  | "aluResult"
  | "memStageAluResultToMemwb"
  | "memStageWriteBackDestToMemwb"
  | "wbLatchedAluResult"
  | "exRtRegister"
  | "exRdRegister"
  | "exDestRegister"
  | "exForwardBValue"
  | "epcValue"
  | "memoryAddress"
  | "memoryWriteData"
  | "memoryReadData"
  | "writeBackValue"
  | "writeBackDest"
  | "pcWriteCtrl"
  | "ifIdWriteCtrl"
  | "pcSrcCtrl"
  | "regDstCtrl"
  | "aluSrcCtrl"
  | "memReadCtrl"
  | "memWriteCtrl"
  | "memToRegCtrl"
  | "fwdACtrl"
  | "fwdBCtrl"
  | "ifFlushCtrl"
  | "exFlushCtrl"
  | "idFlushCtrl"
  | "hazardFlushCtrl"
  | "controlFlushCtrl"
  | "wbFlushCtrl"
  | "mFlushCtrl"
  | "idControlBundle"
  | "zeroControlBundle"
  | "flushedMControlBundle"
  | "flushedWbControlBundle"
  | "flushedExControlBundle"
  | "zeroMControlBundle"
  | "zeroWbControlBundle"
  | "exmemWbControlBundle"
  | "memwbWbControlBundle"
  | "exmemMControlBundle"
  | "wbRegWriteCtrl"
  | "exSourceAReg"
  | "exSourceBReg"
  | "memForwardDest"
  | "wbForwardDest"
  | "memForwardValue";

export type HoveredSignalValues = Partial<Record<HoverSignalKey, string>>;

export const PATH_SIGNAL_MAP: Partial<Record<string, { key: HoverSignalKey; label: string }>> = {
  w_pc_to_imem: { key: "pc", label: "PC" },
  w_pc_to_adder_pc4: { key: "pc", label: "PC" },
  w_4_to_adder_pc4: { key: "constant4", label: "Constant 4" },
  w_adder_pc4_to_ifid: { key: "pcPlus4", label: "PC + 4" },
  w_adder_pc4_to_mux_pcsrc: { key: "nextPcSequential", label: "Sequential Next PC" },
  w_mux_pcsrc_to_pc: { key: "nextPcSelected", label: "Selected Next PC" },
  w_err_addr_to_mux_pcsrc: { key: "exceptionVector", label: "Exception PC" },
  w_imem_to_ifid: { key: "instructionWord", label: "Instruction" },
  w_ifif_to_idex: { key: "idInstructionWord", label: "Instruction" },
  w_to_control: { key: "idInstructionWord", label: "Instruction Decode Input" },
  w_rs2_toregfile: { key: "idRsRegister", label: "Register Number rs" },
  w_rt2_to_regfile: { key: "idRtRegister", label: "Register Number rt" },
  w_ifit_rs2_to_idex: { key: "idRsRegister", label: "ID/EX rs" },
  w_ifid_rt2_to_idex: { key: "idRtRegister", label: "ID/EX rt" },
  w_rt_to_idex: { key: "idRtRegister", label: "ID/EX rt" },
  w_rd2_to_hdu: { key: "idRdRegister", label: "ID rd" },
  w_regfile_rs2_to_idex: { key: "rsValue", label: "Read Data 1" },
  w_regfile_rs2_to_cmp_eq: { key: "rsValue", label: "Read Data 1" },
  w_regfile_rt2_to_idex: { key: "rtValue", label: "Read Data 2" },
  w_regfile_rt2_to_cmp_eq: { key: "rtValue", label: "Read Data 2" },
  w_16bit_imm_to_signext: { key: "imm16Value", label: "Immediate[15:0]" },
  w_signext_32bit_imm_to_idex: { key: "signExtendedImmValue", label: "Sign-Extended Immediate" },
  w_32bit_imm_to_shiftleft2_id: { key: "signExtendedImmValue", label: "Immediate[31:0]" },
  w_ifid_to_adder_branch_id: { key: "idBranchBasePcPlus4", label: "Branch Base (PC + 4)" },
  w_shiftleft2_id_to_adder_branch_id: { key: "idBranchOffsetShifted", label: "Branch Offset << 2" },
  w_adder_branch_id_to_mux_pcsrc: { key: "idBranchTarget", label: "Branch Target" },
  w_idex_rs3_to_mux_fwd_a: { key: "exRawAValue", label: "ID/EX rs Value" },
  w_mux_fwd_a_rs_to_alu_a: { key: "aluInputA", label: "ALU Input A" },
  w_idex_rt3_to_mux_fwd_b: { key: "exRawBValue", label: "ID/EX rt Value" },
  w_mux_fwd_b_to_mux_alusrc: { key: "exForwardBValue", label: "Forwarded B Value" },
  w_idex_32bit_imm_to_mux_alusrc: { key: "exSignExtendedImmValue", label: "Immediate[31:0]" },
  w_mux_alusrc_to_alu_b: { key: "aluInputB", label: "ALU Input B" },
  w_idex_rt_to_mux_regdst: { key: "exRtRegister", label: "rt Register Number" },
  w_idex_rd_to_mux_regdst: { key: "exRdRegister", label: "rd Register Number" },
  w_mux_regdst_to_exmem: { key: "exDestRegister", label: "Destination Register" },
  w_mux_fwd_b_to_exmem: { key: "exForwardBValue", label: "Store Data (Latched)" },
  w_rt3_to_hdu: { key: "exRtRegister", label: "EX rt Register" },
  w_idex_to_epc: { key: "epcValue", label: "EPC Input" },
  w_alu_out_to_exmem: { key: "aluResult", label: "ALU Result" },
  w_exmem_alu_out4_to_dmem: { key: "memoryAddress", label: "Memory Address" },
  w_fwd_b_exmem_to_dmem: { key: "memoryWriteData", label: "Memory Write Data" },
  w_dmem_readdata_to_mux_memtoreg: { key: "memoryReadData", label: "Memory Read Data" },
  w_dmem_aluout_to_memwb: { key: "memoryReadData", label: "Memory Read Data" },
  w_exmem_alu_out_to_memwb: { key: "memStageAluResultToMemwb", label: "MEM/WB ALU Result In" },
  w_exmem_aluout_to_mux_memtoreg: { key: "wbLatchedAluResult", label: "MEM/WB ALU Result" },
  w_mem_to_regfile: { key: "writeBackValue", label: "Writeback Value" },
  w_wb_value_to_mux_fwd_a: { key: "writeBackValue", label: "Writeback Value" },
  w_mux_memtoreg_to_mux_fwd_b: { key: "writeBackValue", label: "Writeback Value" },
  w_exmem_regdst4_memwb: { key: "memStageWriteBackDestToMemwb", label: "MEM/WB Dest Register In" },
  w_dst2_reg_to_regfile: { key: "writeBackDest", label: "Writeback Register" },
  ctrl_pc_write: { key: "pcWriteCtrl", label: "PCWrite" },
  ctrl_ifid_write: { key: "ifIdWriteCtrl", label: "IF/ID Write" },
  ctrl_pcsrc: { key: "pcSrcCtrl", label: "PCSrc" },
  ctrl_regdst: { key: "regDstCtrl", label: "RegDst" },
  ctrl_alusrc: { key: "aluSrcCtrl", label: "ALUSrc" },
  ctrl_mem_read: { key: "memReadCtrl", label: "MemRead" },
  ctrl_mem_write: { key: "memWriteCtrl", label: "MemWrite" },
  ctrl_memtoreg: { key: "memToRegCtrl", label: "MemToReg" },
  ctrl_fwd_a: { key: "fwdACtrl", label: "ForwardA" },
  ctrl_fwd_b: { key: "fwdBCtrl", label: "ForwardB" },
  ctrl_if_flush: { key: "ifFlushCtrl", label: "IF Flush" },
  ctrl_ex_flush_to_mux_m_flush: { key: "exFlushCtrl", label: "EX Flush" },
  ctrl_ex_flush_to_mux_wb_flush: { key: "exFlushCtrl", label: "EX Flush" },
  ctrl_id_flush: { key: "idFlushCtrl", label: "ID Flush" },
  ctrl_hdu_to_or_flush: { key: "hazardFlushCtrl", label: "HDU Flush Request" },
  ctrl_or_flush_to_mux_control_flush: { key: "controlFlushCtrl", label: "Control Flush" },
  ctrl_to_mux_control_flush: { key: "idControlBundle", label: "Decoded Control Bundle" },
  ctrl_0_to_mux_control_flush: { key: "zeroControlBundle", label: "Zero Control Bundle" },
  ctrl_mux_control_flush_to_m: { key: "flushedMControlBundle", label: "ID/EX M Controls" },
  ctrl_mux_control_flush_to_wb: { key: "flushedWbControlBundle", label: "ID/EX WB Controls" },
  ctrl_mux_control_flush_to_ex: { key: "flushedExControlBundle", label: "ID/EX EX Controls" },
  ctrl_wb_flush: { key: "wbFlushCtrl", label: "WB Flush" },
  ctrl_0_to_mux_m_flush: { key: "zeroMControlBundle", label: "Zero M Controls" },
  ctrl_0_to_mux_wb_flush: { key: "zeroWbControlBundle", label: "Zero WB Controls" },
  ctrl_m_flush: { key: "mFlushCtrl", label: "M Flush" },
  ctrl_m_flush_to_hdu: { key: "mFlushCtrl", label: "M Flush" },
  ctrl_mux_wb_flush_to_exmem_wb: { key: "exmemWbControlBundle", label: "EX/MEM WB Controls" },
  ctrl_exmem_wb_to_memwb_wb: { key: "exmemWbControlBundle", label: "MEM/WB WB Controls In" },
  ctrl_exmem_wb_to_forwarding: { key: "exmemWbControlBundle", label: "Forwarding WB Controls (MEM)" },
  ctrl_mux_m_flush_to_exmem_m: { key: "exmemMControlBundle", label: "EX/MEM M Controls" },
  ctrl_memwb_reg_write_to_forwarding: { key: "wbRegWriteCtrl", label: "WB RegWrite" },
  ctrl_memwb_wb_to_forwarding: { key: "memwbWbControlBundle", label: "Forwarding WB Controls (WB)" },
  w_idex_rs_to_forwarding: { key: "exSourceAReg", label: "EX Source rs" },
  w_idex_rt_to_forwarding: { key: "exSourceBReg", label: "EX Source rt" },
  w_exmem_regdst4_to_forwarding: { key: "memForwardDest", label: "MEM Dest Register" },
  w_memwb_regdst4_to_forwarding: { key: "wbForwardDest", label: "WB Dest Register" },
  w_exmem_alu_out_to_mux_fwd_a: { key: "memForwardValue", label: "MEM Forward Value" },
  w_exmem_alu_out4_to_mux_fwd_b: { key: "memForwardValue", label: "MEM Forward Value" },
};
