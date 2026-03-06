"use client";

import { useState, useEffect } from "react";
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  deleteDoc, doc, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  ClipboardList, Plus, Search, X, Loader2, Send,
  CheckCircle, AlertCircle, Clock, Trash2, Eye,
  FileText, Users, BookOpen, Lock, ChevronDown,
} from "lucide-react";
import {
  SYSTEM_TEMPLATES, CATEGORY_COLORS, calculateScore, getPID5DomainScores,
  type SystemTemplate, type ScoredQuestion,
} from "@/lib/assessment-templates";

// ── Types ──────────────────────────────────────────────────────────────────
type QuestionType = "text" | "textarea" | "scale" | "multiChoice" | "yesNo";
interface Question { id:string; type:QuestionType; label:string; required:boolean; options?:string[]; }
interface Template { id:string; title:string; description:string; questions:Question[]; createdBy:string; createdAt:any; }
interface Client { uid:string; displayName:string; email:string; }
interface AssignedAssessment {
  id:string; templateId:string; templateTitle:string; isSystem?:boolean;
  clientId:string; clientName:string; doctorId:string;
  status:"pending"|"completed"; responses:Record<string,string|number>;
  assignedAt:any; completedAt:any; dueDate?:string;
  questions?: Question[];
}

// ── Score result bar ───────────────────────────────────────────────────────
function ScoreBar({ label, score, max, color }: { label:string; score:number; max:number; color:string }) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color:"#4A5568" }}>{label}</span>
        <span className="text-xs font-semibold" style={{ color:"#0D3B44" }}>{score}/{max}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(13,59,68,0.06)" }}>
        <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:color }} />
      </div>
    </div>
  );
}

// ── Scoring panel (doctor view only) ─────────────────────────────────────
function ScoringPanel({ assessment, template }: {
  assessment: AssignedAssessment;
  template: SystemTemplate;
}) {
  const score = calculateScore(template.questions as any, assessment.responses);
  const range = template.scoring.ranges.find(r => score >= r.min && score <= r.max);
  const isPID5 = template.id === "system_pid5";
  const domainScores = isPID5 ? getPID5DomainScores(assessment.responses) : null;

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background:"rgba(13,59,68,0.02)", border:"1px solid rgba(13,59,68,0.08)" }}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color:"#8A9BA8" }}>
        Scoring Summary
      </p>

      {/* Total score */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: range ? range.color + "15" : "rgba(13,59,68,0.06)" }}>
          <span className="text-2xl font-bold" style={{ fontFamily:"var(--font-dm-serif)", color: range?.color ?? "#0D3B44" }}>
            {score}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: range?.color ?? "#0D3B44" }}>
            {range?.label ?? "—"}
          </p>
          <p className="text-xs mt-0.5" style={{ color:"#8A9BA8" }}>
            Score: {score} / {template.scoring.maxScore}
          </p>
        </div>
      </div>

      {/* Score bar */}
      <ScoreBar label={template.shortName} score={score} max={template.scoring.maxScore} color={range?.color ?? "#4ECDC4"} />

      {/* Interpretation */}
      {range && (
        <div className="rounded-xl px-4 py-3" style={{ background: range.color + "10" }}>
          <p className="text-xs leading-relaxed" style={{ color:"#4A5568" }}>{range.description}</p>
        </div>
      )}

      {/* PID-5 domain breakdown */}
      {isPID5 && domainScores && (
        <div className="space-y-2 pt-2 border-t" style={{ borderColor:"rgba(13,59,68,0.08)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color:"#8A9BA8" }}>Domain Scores (0–3)</p>
          {Object.entries(domainScores).map(([domain, avg]) => (
            <div key={domain} className="flex items-center justify-between">
              <span className="text-xs" style={{ color:"#4A5568" }}>{domain}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(13,59,68,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width:`${(avg/3)*100}%`, background: avg > 2 ? "#E8604C" : avg > 1 ? "#D4A853" : "#4ECDC4" }} />
                </div>
                <span className="text-xs font-semibold w-6 text-right" style={{ color:"#0D3B44" }}>{avg}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clinical notes */}
      {template.scoring.notes && (
        <div className="flex items-start gap-2 pt-2 border-t" style={{ borderColor:"rgba(13,59,68,0.08)" }}>
          <Lock size={11} className="flex-shrink-0 mt-0.5" style={{ color:"#8A9BA8" }} />
          <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color:"#8A9BA8" }}>
            {template.scoring.notes}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Response viewer ────────────────────────────────────────────────────────
function ResponseViewer({ assessment, customTemplate, systemTemplate, onClose }: {
  assessment: AssignedAssessment;
  customTemplate?: Template;
  systemTemplate?: SystemTemplate;
  onClose: () => void;
}) {
  const questions = systemTemplate?.questions ?? customTemplate?.questions ?? assessment.questions ?? [];
  const title     = systemTemplate?.title ?? customTemplate?.title ?? assessment.templateTitle;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10"
      style={{ background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)" }}>
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden max-h-[88vh] flex flex-col"
        style={{ background:"#FAF8F3" }}>
        <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor:"rgba(13,59,68,0.08)" }}>
          <div>
            <h3 className="font-semibold" style={{ color:"#0D3B44" }}>{title}</h3>
            <p className="text-xs mt-0.5" style={{ color:"#8A9BA8" }}>
              {assessment.clientName} · Completed{" "}
              {assessment.completedAt?.toDate
                ? assessment.completedAt.toDate().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
                : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5">
            <X size={18} style={{ color:"#4A5568" }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Scoring panel for system templates */}
          {systemTemplate && (
            <ScoringPanel assessment={assessment} template={systemTemplate} />
          )}

          {/* Responses */}
          {questions.map((q: any, i: number) => (
            <div key={q.id} className="rounded-2xl p-5"
              style={{ background:"white", boxShadow:"0 1px 3px rgba(13,59,68,0.06)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color:"#8A9BA8" }}>Q{i+1}</p>
              <p className="text-sm font-medium mb-3" style={{ color:"#0D3B44" }}>{q.label}</p>
              <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(13,59,68,0.03)" }}>
                <p className="text-sm" style={{ color:"#22272B" }}>
                  {assessment.responses[q.id] !== undefined
                    ? String(assessment.responses[q.id])
                    : <span style={{ color:"#C4C4C4" }}>No response</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor:"rgba(13,59,68,0.08)" }}>
          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold border-2"
            style={{ borderColor:"rgba(13,59,68,0.15)", color:"#0D3B44" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Template builder modal ─────────────────────────────────────────────────
function TemplateBuilder({ onSave, onClose, doctorId }: {
  onSave:(t:Omit<Template,"id"|"createdAt">)=>Promise<void>; onClose:()=>void; doctorId:string;
}) {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [questions,   setQuestions]   = useState<Question[]>([]);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string|null>(null);

  function addQ() {
    setQuestions(q=>[...q,{id:`q_${Date.now()}`,type:"text",label:"",required:true}]);
  }
  function updateQ(id:string, u:Partial<Question>) {
    setQuestions(q=>q.map(x=>x.id===id?{...x,...u}:x));
  }
  function removeQ(id:string) { setQuestions(q=>q.filter(x=>x.id!==id)); }

  async function handleSave() {
    if(!title.trim()){setError("Add a title.");return;}
    if(questions.length===0){setError("Add at least one question.");return;}
    if(questions.some(q=>!q.label.trim())){setError("All questions need a label.");return;}
    setSaving(true);
    try { await onSave({title:title.trim(),description:description.trim(),questions,createdBy:doctorId}); onClose(); }
    catch { setError("Failed to save."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10"
      style={{ background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)" }}>
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{ background:"#FAF8F3" }}>
        <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor:"rgba(13,59,68,0.08)" }}>
          <h3 className="font-semibold" style={{ color:"#0D3B44" }}>Build Custom Template</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5"><X size={18} style={{ color:"#4A5568" }}/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {error&&<div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background:"rgba(232,96,76,0.08)",color:"#E8604C" }}><AlertCircle size={14}/>{error}</div>}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color:"#8A9BA8" }}>Title *</label>
            <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Initial Wellbeing Check"
              className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none" style={{ borderColor:"rgba(13,59,68,0.15)",background:"white" }}/>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color:"#8A9BA8" }}>Description</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm border resize-none focus:outline-none" style={{ borderColor:"rgba(13,59,68,0.15)",background:"white" }}/>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"#8A9BA8" }}>Questions ({questions.length})</label>
              <button onClick={addQ} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                style={{ background:"linear-gradient(135deg, #0D3B44, #1A535C)" }}><Plus size={12}/>Add Question</button>
            </div>
            <div className="space-y-3">
              {questions.map((q,i)=>(
                <div key={q.id} className="rounded-2xl p-4" style={{ background:"white",boxShadow:"0 1px 3px rgba(13,59,68,0.06)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold" style={{ color:"#8A9BA8" }}>Q{i+1}</span>
                    <button onClick={()=>removeQ(q.id)} className="p-1 rounded hover:bg-red-50">
                      <Trash2 size={13} style={{ color:"#E8604C" }}/>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color:"#8A9BA8" }}>Type</label>
                      <select value={q.type} onChange={e=>updateQ(q.id,{type:e.target.value as QuestionType})}
                        className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
                        style={{ borderColor:"rgba(13,59,68,0.15)",background:"#FAFAFA" }}>
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="scale">Scale (1–10)</option>
                        <option value="yesNo">Yes / No</option>
                        <option value="multiChoice">Multiple Choice</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color:"#4A5568" }}>
                        <input type="checkbox" checked={q.required} onChange={e=>updateQ(q.id,{required:e.target.checked})}/>Required
                      </label>
                    </div>
                  </div>
                  <input type="text" value={q.label} onChange={e=>updateQ(q.id,{label:e.target.value})}
                    placeholder="Question label..."
                    className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none"
                    style={{ borderColor:"rgba(13,59,68,0.15)",background:"#FAFAFA" }}/>
                  {q.type==="multiChoice"&&(
                    <div className="mt-3">
                      <label className="block text-xs mb-1" style={{ color:"#8A9BA8" }}>Options (one per line)</label>
                      <textarea value={q.options?.join("\n")??""}
                        onChange={e=>updateQ(q.id,{options:e.target.value.split("\n").filter(Boolean)})}
                        rows={3} placeholder="Option 1\nOption 2"
                        className="w-full px-3 py-2 rounded-xl text-xs border resize-none focus:outline-none"
                        style={{ borderColor:"rgba(13,59,68,0.15)",background:"#FAFAFA" }}/>
                    </div>
                  )}
                </div>
              ))}
              {questions.length===0&&(
                <div className="py-8 text-center rounded-2xl" style={{ background:"rgba(13,59,68,0.02)",border:"2px dashed rgba(13,59,68,0.1)" }}>
                  <p className="text-sm" style={{ color:"#8A9BA8" }}>No questions yet — click Add Question</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor:"rgba(13,59,68,0.08)" }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold border-2"
            style={{ borderColor:"rgba(13,59,68,0.15)",color:"#0D3B44" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background:"linear-gradient(135deg, #0D3B44, #1A535C)" }}>
            {saving?<><Loader2 size={14} className="animate-spin"/>Saving...</>:"Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign modal ───────────────────────────────────────────────────────────
function AssignModal({ allTemplates, systemTemplates, clients, doctorId, onAssign, onClose }: {
  allTemplates: Template[]; systemTemplates: SystemTemplate[];
  clients: Client[]; doctorId: string;
  onAssign:(templateId:string, clientId:string, dueDate:string, isSystem:boolean)=>Promise<void>;
  onClose:()=>void;
}) {
  const [templateId, setTemplateId] = useState("");
  const [clientId,   setClientId]   = useState("");
  const [dueDate,    setDueDate]    = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string|null>(null);

  const isSystemTemplate = systemTemplates.some(t=>t.id===templateId);

  async function handleAssign() {
    if(!templateId||!clientId){setError("Please select a template and client.");return;}
    setSaving(true);
    try { await onAssign(templateId,clientId,dueDate,isSystemTemplate); onClose(); }
    catch { setError("Failed to assign."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)" }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden" style={{ background:"#FAF8F3" }}>
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor:"rgba(13,59,68,0.08)" }}>
          <h3 className="font-semibold" style={{ color:"#0D3B44" }}>Assign Assessment</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5"><X size={18} style={{ color:"#4A5568" }}/></button>
        </div>
        <div className="p-6 space-y-4">
          {error&&<div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background:"rgba(232,96,76,0.08)",color:"#E8604C" }}><AlertCircle size={14}/>{error}</div>}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color:"#8A9BA8" }}>Template *</label>
            <select value={templateId} onChange={e=>setTemplateId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
              style={{ borderColor:"rgba(13,59,68,0.15)",background:"white",color:templateId?"#22272B":"#8A9BA8" }}>
              <option value="">Select template</option>
              <optgroup label="── Clinical Library">
                {systemTemplates.map(t=><option key={t.id} value={t.id}>{t.shortName} — {t.title.split("(")[0].trim()}</option>)}
              </optgroup>
              {allTemplates.length>0&&(
                <optgroup label="── My Custom Templates">
                  {allTemplates.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color:"#8A9BA8" }}>Client *</label>
            <select value={clientId} onChange={e=>setClientId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
              style={{ borderColor:"rgba(13,59,68,0.15)",background:"white",color:clientId?"#22272B":"#8A9BA8" }}>
              <option value="">Select client</option>
              {clients.map(c=><option key={c.uid} value={c.uid}>{c.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color:"#8A9BA8" }}>Due Date (optional)</label>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm border focus:outline-none"
              style={{ borderColor:"rgba(13,59,68,0.15)",background:"white" }}/>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor:"rgba(13,59,68,0.08)" }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-semibold border-2"
            style={{ borderColor:"rgba(13,59,68,0.15)",color:"#0D3B44" }}>Cancel</button>
          <button onClick={handleAssign} disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background:"linear-gradient(135deg, #0D3B44, #1A535C)" }}>
            {saving?<><Loader2 size={14} className="animate-spin"/>Sending...</>:<><Send size={14}/>Assign</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DoctorAssessmentsPage() {
  const { user } = useAuth();
  const [templates,   setTemplates]   = useState<Template[]>([]);
  const [assessments, setAssessments] = useState<AssignedAssessment[]>([]);
  const [clients,     setClients]     = useState<Client[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<"responses"|"library"|"custom">("responses");
  const [search,      setSearch]      = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAssign,  setShowAssign]  = useState(false);
  const [viewing,     setViewing]     = useState<AssignedAssessment|null>(null);
  const [toast,       setToast]       = useState<{type:"success"|"error";msg:string}|null>(null);

  function showToast(type:"success"|"error", msg:string) {
    setToast({type,msg}); setTimeout(()=>setToast(null),4000);
  }

  useEffect(()=>{
    if(!user) return;
    (async()=>{
      const [tSnap, aSnap, apptSnap] = await Promise.all([
        getDocs(query(collection(db,"assessmentTemplates"),where("createdBy","==",user.uid),orderBy("createdAt","desc"))),
        getDocs(query(collection(db,"assessments"),where("doctorId","==",user.uid),orderBy("assignedAt","desc"))),
        getDocs(query(collection(db,"appointments"),where("doctorId","==",user.uid))),
      ]);
      setTemplates(tSnap.docs.map(d=>({id:d.id,...d.data()}) as Template));
      setAssessments(aSnap.docs.map(d=>({id:d.id,...d.data()}) as AssignedAssessment));
      const clientIds=[...new Set(apptSnap.docs.map(d=>(d.data() as any).clientId as string))];
      if(clientIds.length>0) {
        const cDocs=await Promise.all(clientIds.map(uid=>getDocs(query(collection(db,"users"),where("uid","==",uid)))));
        const loaded:Client[]=[]; cDocs.forEach(s=>s.docs.forEach(d=>loaded.push({uid:d.id,...d.data()} as Client)));
        loaded.sort((a,b)=>a.displayName.localeCompare(b.displayName)); setClients(loaded);
      }
      setLoading(false);
    })();
  },[user]);

  async function handleSaveTemplate(data:Omit<Template,"id"|"createdAt">) {
    const ref=await addDoc(collection(db,"assessmentTemplates"),{...data,createdAt:serverTimestamp()});
    setTemplates(p=>[{id:ref.id,...data,createdAt:{toDate:()=>new Date()}},...p]);
    showToast("success","Template created.");
  }

  async function handleAssign(templateId:string, clientId:string, dueDate:string, isSystem:boolean) {
    if(!user) return;
    const client=clients.find(c=>c.uid===clientId);
    if(!client) return;

    let title=""; let questions: Question[] = [];
    if(isSystem) {
      const st=SYSTEM_TEMPLATES.find(t=>t.id===templateId);
      if(!st) return;
      title=st.title;
      questions=st.questions as any;
    } else {
      const ct=templates.find(t=>t.id===templateId);
      if(!ct) return;
      title=ct.title;
      questions=ct.questions;
    }

    const ref=await addDoc(collection(db,"assessments"),{
      templateId, templateTitle:title, isSystem,
      clientId, clientName:client.displayName, doctorId:user.uid,
      status:"pending", responses:{},
      questions, // store questions inline so client can render them
      assignedAt:serverTimestamp(), completedAt:null,
      ...(dueDate?{dueDate}:{}),
    });
    setAssessments(p=>[{
      id:ref.id,templateId,templateTitle:title,isSystem,
      clientId,clientName:client.displayName,doctorId:user.uid,
      status:"pending",responses:{},questions,
      assignedAt:{toDate:()=>new Date()},completedAt:null,
      ...(dueDate?{dueDate}:{}),
    },...p]);
    showToast("success",`Assigned to ${client.displayName}.`);
  }

  async function handleDeleteTemplate(id:string) {
    if(!confirm("Delete this template?")) return;
    await deleteDoc(doc(db,"assessmentTemplates",id));
    setTemplates(p=>p.filter(t=>t.id!==id));
    showToast("success","Template deleted.");
  }

  const filtered=assessments.filter(a=>
    a.clientName.toLowerCase().includes(search.toLowerCase())||
    a.templateTitle.toLowerCase().includes(search.toLowerCase())
  );
  const pending=filtered.filter(a=>a.status==="pending");
  const completed=filtered.filter(a=>a.status==="completed");

  function getSystemTemplate(a:AssignedAssessment) {
    return a.isSystem ? SYSTEM_TEMPLATES.find(t=>t.id===a.templateId) : undefined;
  }
  function getCustomTemplate(a:AssignedAssessment) {
    return !a.isSystem ? templates.find(t=>t.id===a.templateId) : undefined;
  }

  const hasClients = clients.length > 0;
  const canAssign  = (templates.length > 0 || true) && hasClients; // system templates always available

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast&&(
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg text-sm font-medium"
          style={{ background:toast.type==="success"?"#0D3B44":"#E8604C",color:"white" }}>
          {toast.type==="success"?<CheckCircle size={16}/>:<AlertCircle size={16}/>}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl" style={{ fontFamily:"var(--font-dm-serif)",color:"#0D3B44" }}>Assessments</h2>
          <p className="text-sm mt-0.5" style={{ color:"#8A9BA8" }}>Clinical tools, custom forms, and client responses</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowBuilder(true)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border-2"
            style={{ borderColor:"rgba(13,59,68,0.15)",color:"#0D3B44" }}>
            <FileText size={14}/> Custom
          </button>
          <button onClick={()=>setShowAssign(true)} disabled={!canAssign}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 hover:-translate-y-0.5 transition-all"
            style={{ background:"linear-gradient(135deg, #0D3B44, #1A535C)" }}>
            <Send size={14}/> Assign
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"Library",    value:SYSTEM_TEMPLATES.length, accent:"#0D3B44", Icon:BookOpen },
          { label:"Assigned",   value:assessments.length,      accent:"#4ECDC4", Icon:Users },
          { label:"Pending",    value:assessments.filter(a=>a.status==="pending").length,   accent:"#D4A853", Icon:Clock },
          { label:"Completed",  value:assessments.filter(a=>a.status==="completed").length, accent:"#2BA8A0", Icon:CheckCircle },
        ].map(({label,value,accent,Icon})=>(
          <div key={label} className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background:"white",boxShadow:"0 1px 4px rgba(13,59,68,0.07)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:accent+"12" }}>
              <Icon size={15} style={{ color:accent }}/>
            </div>
            <div>
              <p className="text-xl font-semibold leading-none"
                style={{ fontFamily:"var(--font-dm-serif)",color:"#0D3B44" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color:"#8A9BA8" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:"rgba(13,59,68,0.06)" }}>
        {([
          { key:"responses", label:"Client Responses" },
          { key:"library",   label:"Clinical Library" },
          { key:"custom",    label:"My Templates" },
        ] as const).map(({key,label})=>(
          <button key={key} onClick={()=>setTab(key)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background:tab===key?"white":"transparent", color:tab===key?"#0D3B44":"#8A9BA8",
              boxShadow:tab===key?"0 1px 3px rgba(13,59,68,0.1)":"none" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin" style={{ color:"#4ECDC4" }}/>
        </div>
      ) : tab==="responses" ? (
        <div className="space-y-5">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color:"#8A9BA8" }}/>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search by client or assessment..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none"
              style={{ borderColor:"rgba(13,59,68,0.12)",background:"white" }}/>
            {search&&<button onClick={()=>setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2"><X size={13} style={{ color:"#8A9BA8" }}/></button>}
          </div>

          {filtered.length===0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background:"white",boxShadow:"0 1px 4px rgba(13,59,68,0.07)" }}>
              <ClipboardList size={24} className="mx-auto mb-3" style={{ color:"#4ECDC4" }}/>
              <p className="text-sm font-medium" style={{ color:"#0D3B44" }}>No assessments assigned yet</p>
              <p className="text-xs mt-1" style={{ color:"#8A9BA8" }}>Assign a clinical tool or custom form to a client.</p>
            </div>
          ) : (
            <>
              {pending.length>0&&(
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color:"#8A9BA8" }}>
                    <Clock size={11}/> Awaiting Response ({pending.length})
                  </p>
                  <div className="space-y-2">
                    {pending.map(a=>(
                      <div key={a.id} className="rounded-xl p-4 flex items-center gap-4"
                        style={{ background:"white",boxShadow:"0 1px 3px rgba(13,59,68,0.06)" }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background:"rgba(212,168,83,0.1)",color:"#B8860B" }}>
                          {a.clientName?.[0]?.toUpperCase()??"C"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color:"#0D3B44" }}>{a.templateTitle}</p>
                          <p className="text-xs" style={{ color:"#8A9BA8" }}>
                            {a.clientName}{a.dueDate&&` · Due ${new Date(a.dueDate+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}`}
                            {a.isSystem&&<span className="ml-1.5 px-1.5 py-0.5 rounded text-xs" style={{ background:"rgba(13,59,68,0.06)",color:"#8A9BA8" }}>Clinical</span>}
                          </p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ background:"rgba(212,168,83,0.1)",color:"#B8860B" }}>Pending</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {completed.length>0&&(
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color:"#8A9BA8" }}>
                    <CheckCircle size={11}/> Completed ({completed.length})
                  </p>
                  <div className="space-y-2">
                    {completed.map(a=>(
                      <div key={a.id} className="rounded-xl p-4 flex items-center gap-4"
                        style={{ background:"white",boxShadow:"0 1px 3px rgba(13,59,68,0.06)" }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background:"rgba(78,205,196,0.1)",color:"#2BA8A0" }}>
                          {a.clientName?.[0]?.toUpperCase()??"C"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color:"#0D3B44" }}>{a.templateTitle}</p>
                          <p className="text-xs" style={{ color:"#8A9BA8" }}>
                            {a.clientName}
                            {a.completedAt?.toDate&&` · ${a.completedAt.toDate().toLocaleDateString("en-US",{month:"short",day:"numeric"})}`}
                            {a.isSystem&&<span className="ml-1.5 px-1.5 py-0.5 rounded text-xs" style={{ background:"rgba(13,59,68,0.06)",color:"#8A9BA8" }}>Clinical</span>}
                          </p>
                        </div>
                        <button onClick={()=>setViewing(a)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background:"rgba(13,59,68,0.06)",color:"#0D3B44" }}>
                          <Eye size={12}/> View + Score
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : tab==="library" ? (
        // ── Clinical Library tab ──
        <div className="space-y-3">
          <div className="rounded-xl p-3 flex items-start gap-2.5"
            style={{ background:"rgba(13,59,68,0.03)",border:"1px solid rgba(13,59,68,0.07)" }}>
            <Lock size={13} className="flex-shrink-0 mt-0.5" style={{ color:"#8A9BA8" }}/>
            <p className="text-xs" style={{ color:"#8A9BA8" }}>
              These are validated, publicly available clinical instruments. Use the <strong>Assign</strong> button to send any of these to a client. Scores are automatically calculated when the client submits.
            </p>
          </div>
          {SYSTEM_TEMPLATES.map(t=>{
            const cat=CATEGORY_COLORS[t.category]??{bg:"rgba(13,59,68,0.06)",color:"#4A5568"};
            return (
              <div key={t.id} className="rounded-2xl p-5"
                style={{ background:"white",boxShadow:"0 1px 4px rgba(13,59,68,0.07)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0"
                      style={{ background:cat.bg,color:cat.color }}>{t.shortName}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color:"#0D3B44" }}>{t.title}</p>
                      <p className="text-xs mt-0.5" style={{ color:"#8A9BA8" }}>{t.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:cat.bg,color:cat.color }}>{t.category}</span>
                        <span className="text-xs" style={{ color:"#C4C4C4" }}>{t.questions.length} items · ~{t.estimatedMinutes} min</span>
                        <span className="text-xs" style={{ color:"#C4C4C4" }}>Score: 0–{t.scoring.maxScore}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={()=>{setShowAssign(true);}}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white flex-shrink-0"
                    style={{ background:"linear-gradient(135deg, #0D3B44, #1A535C)" }}>
                    <Send size={12}/> Assign
                  </button>
                </div>
                {/* Score ranges preview */}
                <div className="mt-4 grid grid-cols-2 gap-1.5">
                  {t.scoring.ranges.slice(0,4).map(r=>(
                    <div key={r.label} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                      style={{ background:r.color+"0D" }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:r.color }}/>
                      <span className="text-xs truncate" style={{ color:r.color }}>{r.label} ({r.min}–{r.max})</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3" style={{ color:"#C4C4C4" }}>{t.reference}</p>
              </div>
            );
          })}
        </div>
      ) : (
        // ── Custom templates tab ──
        <div className="space-y-3">
          {templates.length===0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background:"white",boxShadow:"0 1px 4px rgba(13,59,68,0.07)" }}>
              <FileText size={24} className="mx-auto mb-3" style={{ color:"#4ECDC4" }}/>
              <p className="text-sm font-medium mb-1" style={{ color:"#0D3B44" }}>No custom templates</p>
              <p className="text-xs mb-4" style={{ color:"#8A9BA8" }}>Build your own forms to supplement the clinical library.</p>
              <button onClick={()=>setShowBuilder(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background:"linear-gradient(135deg, #0D3B44, #1A535C)" }}>
                <Plus size={14}/> Create Template
              </button>
            </div>
          ) : (
            templates.map(t=>(
              <div key={t.id} className="rounded-2xl p-5"
                style={{ background:"white",boxShadow:"0 1px 4px rgba(13,59,68,0.07)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color:"#0D3B44" }}>{t.title}</p>
                    {t.description&&<p className="text-xs mt-0.5" style={{ color:"#8A9BA8" }}>{t.description}</p>}
                    <p className="text-xs mt-2" style={{ color:"#C4C4C4" }}>{t.questions.length} question{t.questions.length!==1?"s":""}</p>
                  </div>
                  <button onClick={()=>handleDeleteTemplate(t.id)} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 size={14} style={{ color:"#E8604C" }}/>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showBuilder&&<TemplateBuilder doctorId={user?.uid??""} onSave={handleSaveTemplate} onClose={()=>setShowBuilder(false)}/>}
      {showAssign&&<AssignModal allTemplates={templates} systemTemplates={SYSTEM_TEMPLATES} clients={clients} doctorId={user?.uid??""} onAssign={handleAssign} onClose={()=>setShowAssign(false)}/>}
      {viewing&&(
        <ResponseViewer
          assessment={viewing}
          systemTemplate={getSystemTemplate(viewing)}
          customTemplate={getCustomTemplate(viewing)}
          onClose={()=>setViewing(null)}
        />
      )}
    </div>
  );
}
