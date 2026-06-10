"use client";

import React, { useState, useEffect, useRef } from "react";
import { FiChevronDown, FiSearch } from "react-icons/fi";

export interface DropdownOption {
  value: string;
  label: string;
  labelAr?: string;
  icon?: string | React.ReactNode;
  // Extra fields for automatic mapping
  _id?: string;
  id?: string;
  name?: string;
  name_ar?: string;
  title?: string;
  title_ar?: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[] | string[];
  placeholder?: string;
  language?: string; // "ar" or "en"
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  language = "en",
  disabled = false,
  className = "",
  style,
  label,
  searchable = false,
  searchPlaceholder = "Search...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isRtl = language === "ar";

  // Normalize options
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === "string") {
      return { value: opt, label: opt, labelAr: opt };
    }
    const val = opt.value ?? opt._id ?? opt.id ?? "";
    const lbl = opt.label ?? opt.name ?? opt.title ?? val;
    const lblAr = opt.labelAr ?? opt.name_ar ?? opt.title_ar ?? lbl;
    return {
      value: val,
      label: lbl,
      labelAr: lblAr,
      icon: opt.icon,
    };
  });

  // Filtered options based on search query
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const l = opt.label.toLowerCase();
    const la = opt.labelAr?.toLowerCase() ?? "";
    return l.includes(q) || la.includes(q);
  });

  // Find currently selected option
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const currentDisplayLabel = selectedOption
    ? (isRtl ? selectedOption.labelAr ?? selectedOption.label : selectedOption.label)
    : placeholder;

  return (
    <div
      ref={containerRef}
      className={`custom-dropdown-container ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        position: "relative",
        width: "100%",
        fontFamily: "var(--font-sans)",
        direction: isRtl ? "rtl" : "ltr",
        ...style,
      }}
    >
      {label && (
        <span
          className="custom-dropdown-label"
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "var(--foreground-muted, #64748b)",
            textAlign: isRtl ? "right" : "left",
          }}
        >
          {label}
        </span>
      )}

      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`custom-dropdown-trigger ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderRadius: "12px",
          background: "var(--card-bg, #ffffff)",
          border: isOpen
            ? "1px solid var(--primary, #2563eb)"
            : "1px solid var(--card-border, rgba(226, 232, 240, 0.8))",
          color: disabled ? "var(--foreground-muted, #94a3b8)" : "var(--foreground, #0f172a)",
          fontSize: "0.85rem",
          fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: isOpen
            ? "0 0 0 3px rgba(37, 99, 235, 0.15)"
            : "0 1px 3px rgba(0, 0, 0, 0.02)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
          {selectedOption?.icon && (
            <span style={{ flexShrink: 0, fontSize: "1.1rem" }}>{selectedOption.icon}</span>
          )}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: isRtl ? "right" : "left",
              width: "100%",
            }}
          >
            {currentDisplayLabel}
          </span>
        </div>
        <FiChevronDown
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            marginLeft: isRtl ? "0" : "8px",
            marginRight: isRtl ? "8px" : "0",
            flexShrink: 0,
            fontSize: "1rem",
            color: "var(--foreground-muted, #64748b)",
          }}
        />
      </div>

      {/* Floating Options Panel */}
      {isOpen && (
        <div
          ref={listRef}
          className="custom-dropdown-panel"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "6px",
            zIndex: 9999,
            background: "var(--card-bg-glass-dense, rgba(255, 255, 255, 0.95))",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--card-border, rgba(226, 232, 240, 0.8))",
            borderRadius: "14px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            maxHeight: "300px",
            overflowY: "auto",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            animation: "dropdownFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {searchable && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "8px 12px",
                borderBottom: "1px solid var(--card-border, rgba(226, 232, 240, 0.8))",
                marginBottom: "4px",
              }}
            >
              <FiSearch style={{ color: "var(--foreground-muted, #64748b)", fontSize: "0.9rem" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "0.82rem",
                  color: "var(--foreground)",
                  fontFamily: "var(--font-sans)",
                }}
              />
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div
              style={{
                padding: "12px",
                textAlign: "center",
                color: "var(--foreground-muted, #64748b)",
                fontSize: "0.8rem",
              }}
            >
              {isRtl ? "لا توجد نتائج" : "No results found"}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              const optionLabel = isRtl ? opt.labelAr ?? opt.label : opt.label;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected
                      ? "var(--primary, #2563eb)"
                      : "transparent",
                    color: isSelected
                      ? "#ffffff"
                      : "var(--foreground, #0f172a)",
                    transition: "all 0.15s ease",
                    userSelect: "none",
                    textAlign: isRtl ? "right" : "left",
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(37, 99, 235, 0.08)";
                      e.currentTarget.style.color = "var(--primary, #2563eb)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--foreground, #0f172a)";
                    }
                  }}
                >
                  {opt.icon && (
                    <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{opt.icon}</span>
                  )}
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {optionLabel}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Global CSS animation */}
      <style jsx global>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
