"use client";

import React, { useState } from "react";
import { 
  FiShield, 
  FiCpu, 
  FiDatabase, 
  FiLayers, 
  FiArrowRight, 
  FiCheckCircle, 
  FiLock, 
  FiSettings, 
  FiInfo, 
  FiCode, 
  FiGitCommit,
  FiExternalLink,
  FiZap
} from "react-icons/fi";

interface NodeDetail {
  id: string;
  name: string;
  role: string;
  inputs: string[];
  outputs: string[];
  shares: string[];
  description: string;
}

export default function AdminSecurityDashboard({ language }: { language: string }) {
  const [selectedNode, setSelectedNode] = useState<string | null>("guardrail");

  const nodes: NodeDetail[] = [
    {
      id: "input",
      name: language === "ar" ? "مدخلات المستخدم" : "User Input Node",
      role: language === "ar" ? "استقبال وتنظيم سياق الجلسة" : "Ingest & Sanitize User Request",
      inputs: ["user_prompt", "language", "userEmail", "userId"],
      outputs: ["sanitized_payload", "context_tokens"],
      shares: [language === "ar" ? "سياق الهوية والمصادقة" : "Auth Session Token"],
      description: language === "ar"
        ? "نقطة البداية للمدخلات. يتم تجميع سياق الهوية الإضافي مثل البريد الإلكتروني ورقم تعريف المستخدم ومعرفات الجلسة لإرسالها بالكامل للمصادقة وفحص الامتيازات."
        : "The entrypoint of the pipeline. It automatically appends rich user security contexts (including the authenticated Firebase email, user UID, and active browser locale segment) to ensure strict traceability and downstream policy checks."
    },
    {
      id: "guardrail",
      name: language === "ar" ? "وكيل الحماية والامتيازات" : "Security Guardrail Agent",
      role: language === "ar" ? "فحص الصلاحيات ومكافحة حقن الأوامر" : "Pre-flight Security Audit & Injection Shield",
      inputs: ["sanitized_payload", "userEmail", "userId"],
      outputs: ["authorization_status (CONFIRMED/DENIED)", "audit_logs"],
      shares: ["SUPERADMIN_USER Whitelist", "Administrative Blocked Prefixes"],
      description: language === "ar"
        ? "يقوم بفحص المدخلات ضد هجمات حقن التعليمات البرمجية أو محاولة الوصول لأوامر إدارية مثل 'atlas-'، ويفحص البريد الإلكتروني ضد قائمة مدراء النظام البيضاء."
        : "Our strict pre-flight system. It evaluates prompt semantics against prompt-injection attacks, blocks administrative commands starting with 'atlas-', and checks the authenticated email against the encrypted SUPERADMIN_USER list prior to tool routing."
    },
    {
      id: "orchestrator",
      name: language === "ar" ? "المنسق المركزي" : "Multi-Agent Orchestrator",
      role: language === "ar" ? "توجيه وتنظيم خطوات التنفيذ" : "Dynamic Tool Routing & Planning",
      inputs: ["sanitized_payload", "authorization_status", "database_schema"],
      outputs: ["target_tool_name", "tool_arguments"],
      shares: ["Active Routing Table", "ADK Execution Graphs"],
      description: language === "ar"
        ? "العقل المفكر للعملية. يتلقى الاستعلام المؤكد أمنياً، ويقرر الأداة المناسبة للتنفيذ ويقوم بإنشاء البارامترات اللازمة دون السماح بكتابة استعلامات خام."
        : "The central planning brain. Following ADK framework protocols, the Orchestrator maps the sanitized prompt to a highly specific, parameterized tool (e.g. lookup_user_by_id) rather than general-purpose, high-risk query engines."
    },
    {
      id: "mongodb",
      name: language === "ar" ? "وكيل MongoDB MCP" : "MongoDB MCP Agent",
      role: language === "ar" ? "التنفيذ الآمن والمغلق لقواعد البيانات" : "Isolated Database Execution via MCP Protocol",
      inputs: ["target_tool_name", "tool_arguments"],
      outputs: ["raw_query_results", "db_telemetry_metrics"],
      shares: ["VPC Isolated Cloud Run Router", "MongoDB Read-Only Credentials"],
      description: language === "ar"
        ? "وكيل معزول تماماً ينفذ الأوامر عبر بروتوكول MCP وخوادم Cloud Run داخل شبكة VPC محمية. لا يسمح بأي اتصال مباشر بقواعد البيانات ويستخدم صلاحيات القراءة فقط."
        : "Executes standard, whitelisted database operations through an isolated Google Cloud Run container inside a secure VPC network. No direct raw MongoClient connections or pymongo helpers are permitted. 100% of operations flow exclusively through standardized MCP tools."
    },
    {
      id: "presenter",
      name: language === "ar" ? "مقدم المخرجات والتنسيق" : "Presenter & Stylizer Node",
      role: language === "ar" ? "تنسيق وترجمة النتائج للمستخدم" : "Premium Visual Formatting & Localization",
      inputs: ["raw_query_results", "language", "authorization_status"],
      outputs: ["styled_markdown_tables", "security_alerts", "localized_status"],
      shares: ["Language Dictionary Segments", "Aesthetic Theme Variables"],
      description: language === "ar"
        ? "المسؤول عن التنسيق الجمالي النهائي. يحول نتائج قواعد البيانات الخام أو رسائل المنع الأمنية إلى جداول وعناصر تفاعلية متميزة مع تعريب كامل للمحتوى."
        : "Builds a highly premium, accessible frontend output. It transforms raw database JSON results or security alerts into beautiful, responsive markdown tables, localized summaries, and glassmorphic telemetry cards."
    }
  ];

  const activeNode = nodes.find(n => n.id === selectedNode) || nodes[1];

  const renderArrow = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--card-border-active)", padding: "0 0.5rem" }} className="pulse-icon">
      <FiArrowRight style={{ fontSize: "1.5rem" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%" }}>
      
      {/* 1. Security & Guardrailing Setup Configurations */}
      <section className="panel-card" style={{ width: "100%" }}>
        <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiShield style={{ color: "var(--primary)" }} />
          <span>{language === "ar" ? "تكوينات نظام الحماية والحوكمة النشطة" : "Active Security & Guardrail Configurations"}</span>
        </h2>
        <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
          {language === "ar"
            ? "نظرة عامة على السياسات الأمنية النشطة المفروضة بشكل صارم على جميع عمليات الاستعلام والوصول للبيانات."
            : "Review the active, cryptographic security policies programmatically enforced across all query engines, APIs, and agent interfaces."}
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem"
        }}>
          
          {/* Policy 1: Least Privilege */}
          <div style={{
            padding: "1.25rem",
            background: "rgba(255, 255, 255, 0.45)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-green)" }}>
              <FiCheckCircle />
              <strong style={{ fontSize: "0.95rem" }}>{language === "ar" ? "مبدأ الامتياز الأقل" : "Principle of Least Privilege"}</strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "خادم MCP يعمل بمستخدم قاعدة بيانات للقراءة فقط. لا توجد أي صلاحيات للحذف أو التعديل المباشر للأشخاص غير المصرحين."
                : "The database user mapped to the MCP container has strict, read-only permissions. General-purpose write capabilities are programmatically locked."}
            </p>
          </div>

          {/* Policy 2: Agent-Only Strict Lock */}
          <div style={{
            padding: "1.25rem",
            background: "rgba(255, 255, 255, 0.45)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
              <FiLock />
              <strong style={{ fontSize: "0.95rem" }}>{language === "ar" ? "قفل مخصص للعملاء فقط" : "Strict Agent-Only Execution"}</strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "تم حظر جميع مكاتب الاتصال المباشر (MongoClient, pymongo) بنسبة 100%. خادم MCP المعزول بالكامل هو الممر الوحيد للاستعلام."
                : "Direct native DB clients (pymongo, raw MongoClient) are completely eliminated. 100% of data reads are handled via standardized MCP Tool execution graphs."}
            </p>
          </div>

          {/* Policy 3: Superadmin Authorization */}
          <div style={{
            padding: "1.25rem",
            background: "rgba(255, 255, 255, 0.45)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--secondary-hover)" }}>
              <FiSettings />
              <strong style={{ fontSize: "0.95rem" }}>{language === "ar" ? "فحص الامتيازات الإدارية" : "Designated Superadmin Access"}</strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "الملفات الإدارية الحساسة وإحصائيات القواعد متاحة فقط للبريد الإلكتروني المسجل بالبيئة (contact@asdaa.co, hesham1988@gmail.com)."
                : "Sensitive endpoints like db-metadata are strictly gated. Requests without designated, verified superadmin emails are rejected with HTTP 403."}
            </p>
          </div>

          {/* Policy 4: Cloud Model Armor */}
          <div style={{
            padding: "1.25rem",
            background: "rgba(16, 107, 163, 0.04)",
            border: "1px solid rgba(16, 107, 163, 0.15)",
            borderRadius: "var(--border-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
              <FiCpu className="pulse-icon" />
              <strong style={{ fontSize: "0.95rem" }}>Google Cloud Model Armor</strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "مفعل مسبقاً لحماية الأوامر من المدخلات الضارة، محاولات تجاوز السياق، والعبارات غير الأخلاقية عبر قوالب الأمان الرسمية لـ GCP."
                : "Integrated GCP security templates inspect pre-flight and post-flight streams, shielding prompt scopes from adversarial jailbreaks and system abuse."}
            </p>
          </div>

          {/* Policy 5: Context-Aware Credit Guardrails Privilege Engine */}
          <div style={{
            padding: "1.25rem",
            background: "rgba(212, 175, 55, 0.04)",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            borderRadius: "var(--border-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--secondary)" }}>
              <FiZap className="pulse-icon" />
              <strong style={{ fontSize: "0.95rem" }}>
                {language === "ar" ? "محرك امتيازات حوكمة الرصيد وسياق الهوية" : "Context-Aware Credit Guardrails Privilege Engine"}
              </strong>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#5a6e7c", margin: 0 }}>
              {language === "ar"
                ? "يفرض سياسات تفصيلية ديناميكية لعمليات القراءة والكتابة بناءً على معرّف المستخدم المؤكد، الهوية الرقمية، والرصيد المتبقي. تستهلك العمليات الرصيد تدريجياً، ويتم حظر الكتابة تلقائياً عند نفاد الرصيد."
                : "Dynamically enforces database access constraints based on the authenticated session's user ID, email identity, and remaining credits. Reads/writes consume credits, and write blocking triggers if credits reach zero."}
            </p>
          </div>

        </div>
      </section>

      {/* 2. Interactive Agent Pipeline & DAG Workflows */}
      <section className="panel-card" style={{ width: "100%" }}>
        <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiLayers style={{ color: "var(--secondary)" }} />
          <span>{language === "ar" ? "مخطط سير العمل وهندسة ترابط الوكلاء (DAG)" : "Interactive Multi-Agent Pipeline & DAG Workflow"}</span>
        </h2>
        <p style={{ color: "#4f6371", fontSize: "0.95rem", marginBottom: "2rem" }}>
          {language === "ar"
            ? "انقر على أي عقدة في مخطط تدفق المهام التفاعلي أدناه لعرض تفاصيل المدخلات والمخرجات والمكونات المشتركة."
            : "Click on any node in the interactive workflow layout below to inspect data inputs, outputs, shared structures, and responsibilities."}
        </p>

        {/* The Graphical Visualizer Block */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem"
        }}>
          
          {/* Node Track / Map */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.3)",
            padding: "1.5rem 1rem",
            borderRadius: "var(--border-radius-lg)",
            border: "1px dashed var(--card-border)",
            overflowX: "auto",
            gap: "0.5rem",
            width: "100%"
          }}>
            
            {nodes.map((node, index) => {
              const isSelected = selectedNode === node.id;
              return (
                <React.Fragment key={node.id}>
                  
                  {/* Node Circle Card */}
                  <button
                    onClick={() => setSelectedNode(node.id)}
                    type="button"
                    style={{
                      flexShrink: 0,
                      padding: "1rem",
                      borderRadius: "var(--border-radius-md)",
                      background: isSelected 
                        ? "linear-gradient(135deg, var(--primary), var(--primary-hover))" 
                        : "var(--card-bg)",
                      color: isSelected ? "#ffffff" : "var(--foreground)",
                      border: isSelected 
                        ? "2px solid var(--secondary)" 
                        : "1px solid var(--card-border)",
                      boxShadow: isSelected 
                        ? "0 8px 24px rgba(16, 107, 163, 0.25), 0 0 10px rgba(212, 175, 55, 0.3)" 
                        : "var(--shadow-sm)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.5rem",
                      minWidth: "140px",
                      maxWidth: "180px",
                      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                      textAlign: "center"
                    }}
                    className="dag-node-btn"
                  >
                    <div style={{
                      width: "2.25rem",
                      height: "2.25rem",
                      borderRadius: "50%",
                      backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : "rgba(16, 107, 163, 0.08)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      border: isSelected ? "1px solid #ffffff" : "1px solid var(--card-border)"
                    }}>
                      {node.id === "input" && <FiCode style={{ fontSize: "1.1rem" }} />}
                      {node.id === "guardrail" && <FiShield style={{ fontSize: "1.1rem" }} />}
                      {node.id === "orchestrator" && <FiSettings style={{ fontSize: "1.1rem" }} />}
                      {node.id === "mongodb" && <FiDatabase style={{ fontSize: "1.1rem" }} />}
                      {node.id === "presenter" && <FiLayers style={{ fontSize: "1.1rem" }} />}
                    </div>
                    
                    <strong style={{ fontSize: "0.85rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                      {node.name}
                    </strong>
                    <span style={{ fontSize: "0.7rem", opacity: isSelected ? 0.9 : 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                      {node.id === "input" ? "Step 1" : 
                       node.id === "guardrail" ? "Step 2" : 
                       node.id === "orchestrator" ? "Step 3" : 
                       node.id === "mongodb" ? "Step 4" : "Step 5"}
                    </span>
                  </button>

                  {index < nodes.length - 1 && renderArrow()}
                </React.Fragment>
              );
            })}
          </div>

          {/* Node Inspector details panel */}
          <div style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--border-radius-md)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            transition: "all 0.3s ease"
          }}>
            
            {/* Title & Role */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", margin: 0, fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiCpu style={{ color: "var(--primary)" }} />
                  <span>{activeNode.name}</span>
                </h3>
                <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600 }}>
                  {activeNode.role}
                </span>
              </div>
              <div style={{
                fontSize: "0.75rem",
                padding: "0.3rem 0.75rem",
                background: "linear-gradient(135deg, rgba(16,107,163,0.1), rgba(212,175,55,0.15))",
                borderRadius: "50px",
                border: "1px solid var(--card-border)",
                fontWeight: 600,
                color: "var(--foreground)"
              }}>
                DAG ID: <code style={{ fontFamily: "var(--font-mono)" }}>{activeNode.id}_node</code>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: "0.92rem", color: "#4f6371", lineHeight: "1.6" }}>
              {activeNode.description}
            </p>

            {/* Inputs, Outputs & Shared Resources Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginTop: "0.5rem"
            }}>
              
              {/* Input Variables */}
              <div style={{ background: "rgba(255,255,255,0.7)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(235, 220, 185, 0.4)" }}>
                <strong style={{ fontSize: "0.8rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.5rem" }}>
                  <FiCode />
                  <span>{language === "ar" ? "المتغيرات المدخلة" : "Input Parameters"}</span>
                </strong>
                <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {activeNode.inputs.map((inp, idx) => (
                    <li key={idx} style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "#1c2b36", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <FiGitCommit style={{ color: "var(--secondary)" }} />
                      <span>{inp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Output Variables */}
              <div style={{ background: "rgba(255,255,255,0.7)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(235, 220, 185, 0.4)" }}>
                <strong style={{ fontSize: "0.8rem", color: "var(--accent-orange)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.5rem" }}>
                  <FiLayers />
                  <span>{language === "ar" ? "المخرجات المنتجة" : "Output Stream Variables"}</span>
                </strong>
                <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {activeNode.outputs.map((out, idx) => (
                    <li key={idx} style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "#1c2b36", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <FiGitCommit style={{ color: "var(--secondary)" }} />
                      <span>{out}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Shared States */}
              <div style={{ background: "rgba(16, 107, 163, 0.03)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(16, 107, 163, 0.08)" }}>
                <strong style={{ fontSize: "0.8rem", color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.5rem" }}>
                  <FiCpu />
                  <span>{language === "ar" ? "القواعد والموارد المشتركة" : "Shared Context & States"}</span>
                </strong>
                <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {activeNode.shares.map((share, idx) => (
                    <li key={idx} style={{ fontSize: "0.8rem", color: "#1c2b36", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "var(--accent-green)" }}></span>
                      <span>{share}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

        </div>
      </section>

      <style jsx>{`
        .dag-node-btn:hover {
          transform: translateY(-4px);
          border-color: var(--secondary) !important;
          box-shadow: 0 12px 30px rgba(16, 107, 163, 0.12) !important;
        }
      `}</style>
    </div>
  );
}
