import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { CrmLead, CrmStage, CrmTask } from '../types/crm';
import { INITIAL_CRM_LEADS } from '../data/initialCrmLeads';

const CRM_COLLECTION = 'crm_leads';
const CRM_STORAGE_KEY = 'ooh_crm_leads_v1';
export const APP_OWNER_EMAIL = 'suherman.reklame2012@gmail.com';

/**
 * Retrieve cached CRM leads from LocalStorage with initial seed fallback.
 */
export function getStoredCrmLeads(): CrmLead[] {
  try {
    const raw = localStorage.getItem(CRM_STORAGE_KEY);
    if (!raw) {
      saveStoredCrmLeads(INITIAL_CRM_LEADS);
      return INITIAL_CRM_LEADS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveStoredCrmLeads(INITIAL_CRM_LEADS);
      return INITIAL_CRM_LEADS;
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to read CRM leads from local storage, returning defaults:', err);
    return INITIAL_CRM_LEADS;
  }
}

/**
 * Save CRM leads to LocalStorage.
 */
export function saveStoredCrmLeads(leads: CrmLead[]): void {
  try {
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(leads));
  } catch (err) {
    console.warn('Failed to cache CRM leads to local storage:', err);
  }
}

/**
 * Real-time subscription to CRM leads from Firestore with local fallback.
 */
export function subscribeToCrmLeads(
  onUpdate: (leads: CrmLead[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const colRef = collection(db, CRM_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          // Initialize from local seed if cloud is empty
          const defaults = getStoredCrmLeads();
          onUpdate(defaults);
          // Seed cloud in background
          defaults.forEach(async (lead) => {
            try {
              const docRef = doc(db, CRM_COLLECTION, lead.id);
              await setDoc(docRef, lead, { merge: true });
            } catch (seedErr) {
              // Silently ignore background seed error
            }
          });
          return;
        }

        const cloudLeads: CrmLead[] = [];
        snapshot.forEach((docSnap) => {
          cloudLeads.push({
            ...(docSnap.data() as CrmLead),
            id: docSnap.id
          });
        });

        // Sort: hot first, then updated at
        cloudLeads.sort((a, b) => {
          if (a.priority === 'hot' && b.priority !== 'hot') return -1;
          if (b.priority === 'hot' && a.priority !== 'hot') return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        saveStoredCrmLeads(cloudLeads);
        onUpdate(cloudLeads);
      },
      (err) => {
        console.warn('Firestore CRM leads subscription fallback to local cache:', err);
        const cached = getStoredCrmLeads();
        onUpdate(cached);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Failed to initialize Firestore listener for CRM:', err);
    onUpdate(getStoredCrmLeads());
    return () => {};
  }
}

/**
 * Save or update a CRM lead in Firestore and LocalStorage.
 */
export async function saveCrmLead(lead: CrmLead): Promise<void> {
  const currentLeads = getStoredCrmLeads();
  const existingIdx = currentLeads.findIndex((l) => l.id === lead.id);
  const now = new Date().toISOString();

  const updatedLead: CrmLead = {
    ...lead,
    updatedAt: now
  };

  let nextLeads: CrmLead[];
  if (existingIdx >= 0) {
    nextLeads = [...currentLeads];
    nextLeads[existingIdx] = updatedLead;
  } else {
    nextLeads = [updatedLead, ...currentLeads];
  }

  saveStoredCrmLeads(nextLeads);

  try {
    const docRef = doc(db, CRM_COLLECTION, updatedLead.id);
    await setDoc(docRef, updatedLead, { merge: true });
  } catch (err) {
    console.warn('Failed to sync lead to Firestore, stored locally:', err);
  }
}

/**
 * Fast Stage update (Drag-and-Drop or 1-Click Move).
 */
export async function updateLeadStage(
  leadId: string,
  newStage: CrmStage,
  actor: string = 'Suherman (Admin)'
): Promise<void> {
  const currentLeads = getStoredCrmLeads();
  const lead = currentLeads.find((l) => l.id === leadId);
  if (!lead) return;

  const previousStage = lead.stage;
  if (previousStage === newStage) return;

  const now = new Date().toISOString();
  const historyItem = {
    id: `hist-${Date.now()}`,
    timestamp: now,
    action: `Pindah tahap dari "${previousStage}" ke "${newStage}"`,
    actor,
    fromStage: previousStage,
    toStage: newStage
  };

  const updatedLead: CrmLead = {
    ...lead,
    stage: newStage,
    updatedAt: now,
    history: [historyItem, ...(lead.history || [])]
  };

  await saveCrmLead(updatedLead);
}

/**
 * Delete a CRM lead.
 */
export async function deleteCrmLead(leadId: string): Promise<void> {
  const currentLeads = getStoredCrmLeads();
  const nextLeads = currentLeads.filter((l) => l.id !== leadId);
  saveStoredCrmLeads(nextLeads);

  try {
    const docRef = doc(db, CRM_COLLECTION, leadId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Failed to delete lead from Firestore:', err);
  }
}

/**
 * Add a task to a CRM lead.
 */
export async function addCrmTask(leadId: string, task: Omit<CrmTask, 'id' | 'createdAt'>): Promise<void> {
  const currentLeads = getStoredCrmLeads();
  const lead = currentLeads.find((l) => l.id === leadId);
  if (!lead) return;

  const newTask: CrmTask = {
    ...task,
    id: `task-${Date.now()}`,
    createdAt: new Date().toISOString()
  };

  const updatedLead: CrmLead = {
    ...lead,
    tasks: [...(lead.tasks || []), newTask],
    updatedAt: new Date().toISOString()
  };

  await saveCrmLead(updatedLead);
}

/**
 * Toggle task completion.
 */
export async function toggleCrmTask(leadId: string, taskId: string): Promise<void> {
  const currentLeads = getStoredCrmLeads();
  const lead = currentLeads.find((l) => l.id === leadId);
  if (!lead) return;

  const updatedTasks = (lead.tasks || []).map((t) =>
    t.id === taskId ? { ...t, completed: !t.completed } : t
  );

  const updatedLead: CrmLead = {
    ...lead,
    tasks: updatedTasks,
    updatedAt: new Date().toISOString()
  };

  await saveCrmLead(updatedLead);
}

/**
 * Delete a task from a lead.
 */
export async function deleteCrmTask(leadId: string, taskId: string): Promise<void> {
  const currentLeads = getStoredCrmLeads();
  const lead = currentLeads.find((l) => l.id === leadId);
  if (!lead) return;

  const updatedTasks = (lead.tasks || []).filter((t) => t.id !== taskId);

  const updatedLead: CrmLead = {
    ...lead,
    tasks: updatedTasks,
    updatedAt: new Date().toISOString()
  };

  await saveCrmLead(updatedLead);
}

/**
 * Calculate executive pipeline KPIs.
 */
export function calculateCrmMetrics(leads: CrmLead[]) {
  const activeStages: CrmStage[] = ['lead_baru', 'follow_up', 'negosiasi'];
  const activeLeads = leads.filter((l) => activeStages.includes(l.stage));
  
  const activePipelineValue = activeLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  const wonLeads = leads.filter((l) => l.stage === 'won');
  const wonValue = wonLeads.reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
  const lostLeads = leads.filter((l) => l.stage === 'lost');

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  // Hot leads & Attention leads
  const hotLeads = activeLeads.filter((l) => l.priority === 'hot');
  const attentionLeads = activeLeads.filter((l) => {
    const isPriorityAttention = l.priority === 'attention';
    const isOverdue = l.nextActionDate && l.nextActionDate < todayStr;
    return isPriorityAttention || isOverdue;
  });

  // Tasks due today or tomorrow
  let allTasks: Array<CrmTask & { leadId: string; companyName: string }> = [];
  leads.forEach((l) => {
    (l.tasks || []).forEach((t) => {
      allTasks.push({
        ...t,
        leadId: l.id,
        companyName: l.companyName
      });
    });
  });

  const pendingTasks = allTasks.filter((t) => !t.completed);
  const todayTasks = pendingTasks.filter((t) => t.dueDate <= todayStr);
  const tomorrowTasks = pendingTasks.filter((t) => t.dueDate === tomorrowStr);

  const totalFinishedDeals = wonLeads.length + lostLeads.length;
  const winRatePercent = totalFinishedDeals > 0 
    ? Math.round((wonLeads.length / totalFinishedDeals) * 100) 
    : (leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0);

  return {
    activePipelineValue,
    activeLeadsCount: activeLeads.length,
    hotLeadsCount: hotLeads.length,
    attentionLeadsCount: attentionLeads.length,
    hotAndAttentionLeads: [...new Set([...hotLeads, ...attentionLeads])],
    todayTasksCount: todayTasks.length,
    tomorrowTasksCount: tomorrowTasks.length,
    todayTasks,
    tomorrowTasks,
    wonValue,
    wonCount: wonLeads.length,
    lostCount: lostLeads.length,
    winRatePercent
  };
}
