export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface AgentRequest {
  query: string;
  capital: number;
  user_id: string;
  risk_profile: 'conservative' | 'neutral' | 'aggressive';
  skip_web3?: boolean;
}

export interface StepEvent {
  type: 'step_update';
  step: string;
  status: 'running' | 'completed' | 'error' | 'pending';
  data: Record<string, any>;
}

export interface FinalResult {
  type: 'final_result';
  data: {
    decision?: {
      action: string;
      allocation: Record<string, number>;
      reasoning: string[];
      risk_score: number;
      confidence: number;
    };
    portfolio?: {
      wallet_state: Record<string, any>;
      projected_return: string;
      risk_level: string;
      allocation?: Record<string, { percentage: number; amount: number; current_price?: number; change_24h?: number; expected_annual_return?: string }>;
      capital?: number;
    };
    simulation?: {
      simulation: string;
      gas_fee: string;
      new_allocation: Record<string, number>;
      tx_hash: string;
    };
    risk_score: number;
    confidence: number;
  };
}

export type AgentEvent = StepEvent | FinalResult;

export interface LogEntry {
  timestamp: string;
  user_id: string;
  operation_type: string;
  run_id: string;
  data: Record<string, any>;
  result: Record<string, any>;
  duration: number;
  success: boolean;
}

export interface ReviewResult {
  run_id: string;
  accuracy?: number;
  analysis?: {
    accuracy_score: number;
    comparison_details: Record<string, { simulated_price: number; real_price: number; deviation: string }>;
    simulated_data_summary?: { total_steps: number; tool_calls_count: number; decisions_count: number };
  };
  differences?: Array<{
    metric: string;
    simulated: number;
    actual: number;
    deviation: number;
  }>;
  recommendations: string[];
  created_at: string;
}

export interface ReviewIteration {
  iteration_id: string;
  run_id: string;
  improvements: string[];
  notes: string;
  created_at: string;
}

export interface MarketPrice {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  market_cap: number;
}

export interface TrendingCoin {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
  sparkline: number[];
}

export interface MarketOverview {
  total_market_cap: number;
  total_volume_24h: number;
  btc_dominance: number;
  active_currencies: number;
}

export interface MarketSuggestion {
  type: 'buy' | 'sell' | 'watch' | 'buy_low';
  symbol: string;
  name: string;
  price: number;
  change_1h?: number;
  change_24h?: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface MarketSuggestionsResponse {
  suggestions: MarketSuggestion[];
  trending_up: Array<{ symbol: string; name: string; change: number }>;
  trending_down: Array<{ symbol: string; name: string; change: number }>;
  overall_market_trend: 'bullish' | 'bearish' | 'stable';
  count: number;
}

export async function* streamAgentRun(request: AgentRequest): AsyncGenerator<AgentEvent> {
  const response = await fetch(`${API_BASE}/agent/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const data = line.replace(/^data:\s*/, '');
      if (data.trim()) {
        yield JSON.parse(data);
      }
    }
  }
}

export async function getLogsList(): Promise<{ files: string[]; total: number }> {
  const response = await fetch(`${API_BASE}/logs/list`);
  if (!response.ok) throw new Error('Failed to fetch logs');
  return response.json();
}

export async function getLogsByDate(date: string): Promise<LogEntry[]> {
  const response = await fetch(`${API_BASE}/logs/${date}`);
  if (!response.ok) throw new Error('Failed to fetch logs by date');
  const data = await response.json();
  return data.logs || [];
}

export async function getRecentLogs(count: number = 10): Promise<LogEntry[]> {
  const response = await fetch(`${API_BASE}/logs/recent?limit=${count}`);
  if (!response.ok) throw new Error('Failed to fetch recent logs');
  const data = await response.json();
  return data.logs || [];
}

export async function deleteLogs(date: string): Promise<void> {
  const response = await fetch(`${API_BASE}/logs/${date}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete logs');
}

export async function analyzeReview(run_id: string): Promise<ReviewResult> {
  const response = await fetch(`${API_BASE}/review/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id }),
  });
  if (!response.ok) throw new Error('Failed to analyze review');
  return response.json();
}

export async function iterateReview(data: {
  run_id: string;
  improvements: string[];
  notes: string;
}): Promise<ReviewIteration> {
  const response = await fetch(`${API_BASE}/review/iterate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create iteration');
  return response.json();
}

export async function getReviewHistory(): Promise<ReviewResult[]> {
  const response = await fetch(`${API_BASE}/review/history`);
  if (!response.ok) throw new Error('Failed to fetch review history');
  const data = await response.json();
  return data.reviews || [];
}

export async function getReview(run_id: string): Promise<ReviewResult> {
  const response = await fetch(`${API_BASE}/review/${run_id}`);
  if (!response.ok) throw new Error('Failed to fetch review');
  return response.json();
}

export async function getMarketLive(symbol: string): Promise<MarketPrice> {
  const response = await fetch(`${API_BASE}/market/live/${symbol}`);
  if (!response.ok) throw new Error('Failed to fetch market live data');
  return response.json();
}

export async function getMarketOverview(): Promise<MarketOverview> {
  const response = await fetch(`${API_BASE}/market/overview`);
  if (!response.ok) throw new Error('Failed to fetch market overview');
  return response.json();
}

export async function getMarketTrending(): Promise<{ coins: any[]; count: number }> {
  const response = await fetch(`${API_BASE}/market/trending`);
  if (!response.ok) throw new Error('Failed to fetch trending coins');
  return response.json();
}

export async function getMarketSuggestions(): Promise<MarketSuggestionsResponse> {
  const response = await fetch(`${API_BASE}/market/suggestions`);
  if (!response.ok) throw new Error('Failed to fetch market suggestions');
  return response.json();
}

export async function confirmWeb3Simulation(allocation: Record<string, any>, capital: number): Promise<any> {
  const response = await fetch(`${API_BASE}/web3/simulate/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allocation, capital }),
  });
  if (!response.ok) throw new Error('Failed to execute Web3 simulation');
  return response.json();
}

export interface LlmModel {
  name: string;
  size: number;
  modified_at: string;
}

export async function getLlmModels(): Promise<{ models: LlmModel[]; count: number }> {
  const response = await fetch(`${API_BASE}/settings/llm/models`);
  if (!response.ok) throw new Error('Failed to fetch LLM models');
  return response.json();
}

export async function getBacktestPerformance(): Promise<any> {
  const response = await fetch(`${API_BASE}/backtest/performance`);
  if (!response.ok) throw new Error('Failed to fetch backtest performance');
  return response.json();
}

export async function getBacktestHistory(limit: number = 20): Promise<any> {
  const response = await fetch(`${API_BASE}/backtest/history?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch backtest history');
  return response.json();
}
