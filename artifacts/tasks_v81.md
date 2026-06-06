# Ingestion v2 Block Layout Viewer Checklist

- [x] Add interactive MCQ selections state `selectedMcqAnswers` inside `LibraryPanel.tsx`
- [x] Implement robust inline text style formatter `parseInlineStyles` for standard markdown symbols
- [x] Implement `getBlockProp` helper to support translation languages overlay (`i18n`) on top of active block fields
- [x] Implement block-tree hierarchy builder to group elements under their correct parent blocks
- [x] Implement beautiful visual block-type renderers with advanced styling and glassmorphic colors
- [x] Replace `renderPremiumContent` call with direct block-tree rendering container
- [x] Implement `compilePageTextForTts` helper to construct a linear text flow for TTS reading
- [x] Wire block compilation helper to play audio events seamlessly
- [x] Delete legacy `renderPremiumContent` definition to clean up codebase
- [x] Perform Next.js compiler smoke test and verify the build works without any errors
