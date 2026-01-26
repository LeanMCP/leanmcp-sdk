import { Tool, SchemaConstraint, Optional } from "@leanmcp/core";

class IncrementInput {
  @Optional()
  @SchemaConstraint({
    description: "Amount to increment by",
    default: 1,
  })
  amount?: number;
}

export default class CounterService {
  private counters = new Map<string, number>();

  @Tool({
    description: "Increment a counter (tests session state persistence)",
    inputClass: IncrementInput,
  })
  async increment(params: IncrementInput, extra: any) {
    const sessionId = extra?.sessionId || 'default';
    const amount = typeof params.amount === 'number' ? params.amount : 1;
    const current = this.counters.get(sessionId) || 0;
    const newValue = current + amount;
    this.counters.set(sessionId, newValue);

    console.log(`[Counter] Session ${sessionId.substring(0, 8)}: ${current} -> ${newValue}`);

    return {
      sessionId,
      total: newValue,
      message: `Counter incremented! Session ${sessionId.substring(0, 8)}: ${newValue}`,
    };
  }

  @Tool({
    description: "Get current counter value for this session",
  })
  async getCounter(params: {}, extra: any) {

    const sessionId = extra?.sessionId || 'default';
    const value = this.counters.get(sessionId) || 0;

    console.log(`[Counter] Session ${sessionId.substring(0, 8)}: ${value}`);

    return {
      sessionId,
      total: value,
      message: `Current counter for session ${sessionId.substring(0, 8)}: ${value}`,
    };
  }

  @Tool({
    description: "Reset counter to zero",
  })
  async resetCounter(params: {}, extra: any) {

    const sessionId = extra?.sessionId || 'default';
    this.counters.set(sessionId, 0);

    console.log(`[Counter] Session ${sessionId.substring(0, 8)}: RESET to 0`);

    return {
      sessionId,
      total: 0,
      message: `Counter reset for session ${sessionId.substring(0, 8)}`,
    };
  }
}