# v21 implementation progress

- tokens, font, shared components: 5921ec9 (done)
- presets (screen 1): 5c51bfa (done; typecheck, lint, test 201 pass; KOL split on author field needs owner confirmation)
- device pick (screen 8): 52faba4 (done; typecheck, lint, test 201 pass; notify is UI-only, src/core has no notify feature, owner to confirm)
- intro (screen 0): 9f07e62 (done; typecheck, lint, test 201 pass)
- remove KOL/Của tôi tabs and notify (step a): e0a9767 (done; typecheck, lint, test 200 pass; content.ts writeCard restored; step-b WIP in content.ts, SettingRow, Stepper, Toggle left unstaged)
- slot edit (step b): bfb721f (done; typecheck, lint, test 200 pass; SettingRow/Stepper/Toggle restyled; 4th NEXT label 'Tiếp: Cắm máy' not added, repo flow has no stage 4, ambiguity J)
- camera connect (screen 3): cbb75da (done; typecheck, lint, test 200 pass; spinner row via Loading, unformatted detail behind "Chi tiết"; 2200 ms simulated wait not added, real card read replaces it; ZV-E10 model name not shown in waiting state)
- write (screen 4): a95d5a4 (done; typecheck, lint, test 200 pass; Android grant action replaces access gate in connect stage; footer hidden and 'Đừng rút cáp' caption while writing; ring unchanged)
- recall (screen 5): (done; typecheck, lint, test 200 pass; "Khôi phục" opens confirm "Khôi phục bản trước?" (ambiguity K) and restores this session's backup through the shared src/card/restore.ts core, also used by backups.tsx; "Xem thử" unchanged; cancel label uses repo "Hủy", not SPEC "Huỷ")
