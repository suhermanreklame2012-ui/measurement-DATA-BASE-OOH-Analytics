export interface TriLayerAgentResponse {
  success: boolean;
  layer: string;
  chiefArchitectResponse?: string | null;
  businessAgentResponse?: string | null;
  automationAgentResponse?: string | null;
  unifiedArchitecture: string;
  n8nWorkflowJson?: any;
  firestoreRulesArtifact?: string;
  timestamp: string;
  error?: string;
}

export interface N8nTemplatesResponse {
  success: boolean;
  templates: Record<string, any>;
  instructions: string;
}

export async function runTriLayerOrchestrator(
  userPrompt: string,
  layer: 'orchestrated_full' | 'chief_architect' | 'business_agent' | 'automation_agent' = 'orchestrated_full',
  contextData: any = {}
): Promise<TriLayerAgentResponse> {
  try {
    const res = await fetch('/api/ai/agent-orchestrator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userPrompt,
        layer,
        contextData
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error('Error running Tri-Layer Orchestrator:', err);
    throw err;
  }
}

export async function fetchN8nWorkflowTemplates(): Promise<N8nTemplatesResponse> {
  try {
    const res = await fetch('/api/ai/n8n-workflow-templates');
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.error('Error fetching n8n templates:', err);
    throw err;
  }
}
