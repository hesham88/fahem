import re
import os

file_path = r"C:\Users\hesh1\Desktop\fahem\web\src\components\AdminSecurityDashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's find the start and end indices of each block
# Section 1: {/* 1. Security & Guardrailing Setup Configurations */}
# Section 2: {/* 2. Interactive Agent Pipeline & DAG Workflows */}
# Section 3: {/* 3. Real-Time Admin Logging & Guardrails Audit Console */}
# Section 4: {/* 4. Executive Global Token Analytics Panel */}
# Section 5: {/* 5. Global Operational Activity Trail */}

sec1_comment = "      {/* 1. Security & Guardrailing Setup Configurations */}"
sec2_comment = "      {/* 2. Interactive Agent Pipeline & DAG Workflows */}"
sec3_comment = "      {/* 3. Real-Time Admin Logging & Guardrails Audit Console */}"
sec4_comment = "      {/* 4. Executive Global Token Analytics Panel */}"
sec5_comment = "      {/* 5. Global Operational Activity Trail */}"

idx1 = content.find(sec1_comment)
idx2 = content.find(sec2_comment)
idx3 = content.find(sec3_comment)
idx4 = content.find(sec4_comment)
idx5 = content.find(sec5_comment)

if idx1 == -1 or idx2 == -1 or idx3 == -1 or idx4 == -1 or idx5 == -1:
    print("Error: Could not find all section comments!")
    print(f"idx1: {idx1}, idx2: {idx2}, idx3: {idx3}, idx4: {idx4}, idx5: {idx5}")
    exit(1)

# Extract each block
block1 = content[idx1:idx2]
block2 = content[idx2:idx3]
block3 = content[idx3:idx4]
block4 = content[idx4:idx5]

# Let's verify the blocks end cleanly with newlines and indentation
print("Extracted all blocks successfully!")

# Now, we want to inject the beautiful "Token Controls & File Upload Limits Control Panel" inside block4.
# Block 4 contains:
#   <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
#     {/* Token Stats Grid */}
#     <div style={{ ... }}> ... </div> (the grid of cards)
#     {/* Interactive Token Telemetry Visual Chart */}
#     ...
# Let's insert our Control Panel code inside block4 right after the Token Stats Grid's closing div.
# In the original block4, the Token Stats Grid's mapped cards end with:
#             ))}
#           </div>
# Let's find the position of the first occurrence of:
#             ))}
#           </div>
# inside block4, and insert the panel code right after that!

target_marker = "            ))}\n          </div>"
marker_idx = block4.find(target_marker)
if marker_idx == -1:
    # try with different newlines or spacing
    target_marker = "            ))}\r\n          </div>"
    marker_idx = block4.find(target_marker)

if marker_idx == -1:
    print("Error: Could not find the end of the Token Stats Grid mapping in Section 4!")
    exit(1)

insert_pos = marker_idx + len(target_marker)

controls_panel_code = """

          {/* Interactive Token Controls & File Upload Limits Setup */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1.5rem",
            marginTop: "1.5rem",
            marginBottom: "1.5rem"
          }}>
            {/* Token Allocation Controls Card */}
            <div style={{
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid var(--card-border)",
              borderRadius: "var(--border-radius-md)",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                <FiSettings style={{ color: "var(--primary)" }} />
                <span>{language === "ar" ? "إعدادات وقواعد التحكم بالرموز (Tokens)" : "Cognitive Token Controls & Allocations"}</span>
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: 0 }}>
                {language === "ar" ? "تحديد سقف وحصص الاستهلاك اليومية والأسبوعية للحد من التكلفة وضمان استقرار الخدمة." : "Configure cognitive token limitations across Daily, Weekly, and Monthly intervals to prevent API runaway bills."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد اليومي المخصص للمستعلم" : "Daily Limit Per Student"}</span>
                    <span style={{ color: "var(--primary)", fontWeight: 700, fontFamily: "monospace" }}>{dailyAllocationLimit.toLocaleString()} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="100000"
                    step="5000"
                    value={dailyAllocationLimit}
                    onChange={(e) => setDailyAllocationLimit(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--primary)" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد الأسبوعي للمستعلم" : "Weekly Limit Per Student"}</span>
                    <span style={{ color: "var(--secondary)", fontWeight: 700, fontFamily: "monospace" }}>{weeklyAllocationLimit.toLocaleString()} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="50000"
                    max="500000"
                    step="10000"
                    value={weeklyAllocationLimit}
                    onChange={(e) => setWeeklyAllocationLimit(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--secondary)" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد الشهري الأقصى" : "Monthly Allocated Limit"}</span>
                    <span style={{ color: "var(--accent-orange)", fontWeight: 700, fontFamily: "monospace" }}>{monthlyAllocationLimit.toLocaleString()} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="200000"
                    max="2000000"
                    step="50000"
                    value={monthlyAllocationLimit}
                    onChange={(e) => setMonthlyAllocationLimit(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent-orange)" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px dashed var(--card-border)" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{language === "ar" ? "تفعيل الرقابة الصارمة" : "Strict Limit Enforcement"}</span>
                  <label className="switch-label" style={{ position: "relative", display: "inline-block", width: "42px", height: "20px" }}>
                    <input
                      type="checkbox"
                      checked={isTokenControlActive}
                      onChange={(e) => setIsTokenControlActive(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: isTokenControlActive ? "var(--primary)" : "#cbd5e1",
                      transition: "0.3s",
                      borderRadius: "20px"
                    }}>
                      <span style={{
                        position: "absolute",
                        content: '""',
                        height: "14px", width: "14px",
                        left: isTokenControlActive ? "24px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        transition: "0.3s",
                        borderRadius: "50%"
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* File Upload Size & Format Constraints Card */}
            <div style={{
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid var(--card-border)",
              borderRadius: "var(--border-radius-md)",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <h3 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                <FiLock style={{ color: "var(--accent-orange)" }} />
                <span>{language === "ar" ? "تكوينات قيود وحجم الملفات المرفوعة" : "File Upload & Size Limit Configurations"}</span>
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6a7c88", margin: 0 }}>
                {language === "ar" ? "التحكم في الحد الأقصى للمرفقات وصيغ الملفات المسموح بها لحماية الخوادم والاشتراكات." : "Set hard-limits on custom textbook and notes uploads to safeguard cluster space and optimize parsing overhead."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem", fontSize: "0.8rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{language === "ar" ? "الحد الأقصى لحجم الملف الواحد" : "Maximum Size Allowed"}</span>
                    <span style={{ color: "var(--accent-orange)", fontWeight: 700, fontFamily: "monospace" }}>{maxUploadSize} MB</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={maxUploadSize}
                    onChange={(e) => setMaxUploadSize(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent-orange)" }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.4rem", color: "var(--foreground)" }}>
                    {language === "ar" ? "الصيغ والامتدادات المسموح بها" : "Allowed Attachment Formats"}
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    {[
                      { key: "pdf", label: "PDF Documents" },
                      { key: "docx", label: "Word (DOCX)" },
                      { key: "txt", label: "Text Files (TXT)" },
                      { key: "images", label: "Images (PNG/JPG)" }
                    ].map((fmt) => (
                      <label key={fmt.key} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", cursor: "pointer", color: "#475569" }}>
                        <input
                          type="checkbox"
                          checked={(allowedUploadFormats as any)[fmt.key]}
                          onChange={(e) => setAllowedFormats({ ...allowedUploadFormats, [fmt.key]: e.target.checked })}
                          style={{ accentColor: "var(--accent-orange)" }}
                        />
                        <span>{fmt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px dashed var(--card-border)" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{language === "ar" ? "فحص الملفات سحابياً قبل الحفظ" : "Pre-upload Sandbox Malware Scan"}</span>
                  <label className="switch-label" style={{ position: "relative", display: "inline-block", width: "42px", height: "20px" }}>
                    <input
                      type="checkbox"
                      checked={isUploadScanningEnabled}
                      onChange={(e) => setIsUploadScanningEnabled(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: "absolute",
                      cursor: "pointer",
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: isUploadScanningEnabled ? "var(--accent-orange)" : "#cbd5e1",
                      transition: "0.3s",
                      borderRadius: "20px"
                    }}>
                      <span style={{
                        position: "absolute",
                        content: '""',
                        height: "14px", width: "14px",
                        left: isUploadScanningEnabled ? "24px" : "3px",
                        bottom: "3px",
                        backgroundColor: "white",
                        transition: "0.3s",
                        borderRadius: "50%"
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Config Action Row */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "1rem", borderTop: "1px dashed var(--card-border)", paddingTop: "1rem" }}>
            {configSaveSuccess && (
              <span style={{ fontSize: "0.85rem", color: "var(--accent-green)", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <FiCheckCircle />
                {configSaveSuccess}
              </span>
            )}
            <button
              onClick={handleSaveConfigs}
              disabled={isSavingConfigs}
              className="btn btn-primary"
              style={{ padding: "0.6rem 1.5rem", minWidth: "180px", background: "linear-gradient(135deg, var(--primary), var(--secondary))", border: "none", boxShadow: "var(--shadow-md)" }}
            >
              {isSavingConfigs ? <FiRefreshCw className="spinning-icon" /> : <FiLock />}
              <span>{isSavingConfigs ? (language === "ar" ? "جاري الحفظ والإنفاذ..." : "Deploying Policies...") : (language === "ar" ? "حفظ وتطبيق السياسات" : "Save & Apply Policies")}</span>
            </button>
          </div>
"""

modified_block4 = block4[:insert_pos] + controls_panel_code + block4[insert_pos:]

# Construct the reordered body of returned JSX
# Order should be: block1, modified_block4, block2, block3
reordered_jsx_body = block1 + modified_block4 + block2 + block3

# Now let's build the full content back
full_new_content = content[:idx1] + reordered_jsx_body + content[idx5:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(full_new_content)

print("Dashboard file successfully reordered, enriched, and saved!")
