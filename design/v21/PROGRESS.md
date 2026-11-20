# v21 implementation progress

- tokens, font, shared components: 5921ec9 (done)
- presets (screen 1): 5c51bfa (done; typecheck, lint, test 201 pass; KOL split on author field needs owner confirmation)
- device pick (screen 8): 52faba4 (done; typecheck, lint, test 201 pass; notify is UI-only, src/core has no notify feature, owner to confirm)
- intro (screen 0): 9f07e62 (done; typecheck, lint, test 201 pass)
- remove KOL/Của tôi tabs and notify (step a): e0a9767 (done; typecheck, lint, test 200 pass; content.ts writeCard restored; step-b WIP in content.ts, SettingRow, Stepper, Toggle left unstaged)
- slot edit (step b): bfb721f (done; typecheck, lint, test 200 pass; SettingRow/Stepper/Toggle restyled; 4th NEXT label 'Tiếp: Cắm máy' not added, repo flow has no stage 4, ambiguity J)
- camera connect (screen 3): cbb75da (done; typecheck, lint, test 200 pass; spinner row via Loading, unformatted detail behind "Chi tiết"; 2200 ms simulated wait not added, real card read replaces it; ZV-E10 model name not shown in waiting state)
- write (screen 4): a95d5a4 (done; typecheck, lint, test 200 pass; Android grant action replaces access gate in connect stage; footer hidden and 'Đừng rút cáp' caption while writing; ring unchanged)
- recall (screen 5): 54af9e6 (done; typecheck, lint, test 200 pass; "Khôi phục" opens confirm "Khôi phục bản trước?" (ambiguity K) and restores this session's backup through the shared src/card/restore.ts core, also used by backups.tsx; "Xem thử" unchanged; cancel label uses repo "Hủy", not SPEC "Huỷ")
- preview (screen 6): (done; typecheck, lint, test 200 pass; live state none/checking/ok drives guide card, hero spinner and toolbar tint; header "Xem thử" shown on both platforms (ambiguity D, not changed); fullscreen close right 16 already matched (spacing.lg), top uses insets.top + 12 instead of fixed 44 for notch devices; recheck spinner uses "Đang mở hình từ máy…" not SPEC recheckLabel; Android shoot gating follows liveOn (ambiguity M))
- dark mode (step g): (done; typecheck, lint, test 200 pass; guide, logs, backups now read palette via useTheme (were static light colors); intro LCD mock colours kept as fixed device illustration; ReadabilityScrim black overlay kept over photos; ScrollEdge already uses theme bg; dark token values per SPEC 1.2 unchanged)
- remove access route (step h): (done; typecheck, lint, test 194 pass; access.tsx deleted; guard now only redirects first launch to device pick, GuardInput is seen + route; access gate tests removed; useCardDriver access/deferred kept (write and backups still use grantAccess); content.home.onboarding strings kept (write uses them); lint warning in src/core/web presets.ts is pre-existing)
