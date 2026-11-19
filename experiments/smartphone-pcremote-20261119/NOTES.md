# smartphoneConnect / pcRemote decode attempt, 2026-11-19, ZV-E10 fw 2.00

Saved on camera in P mode, nothing else changed between saves:
- M1: Ctrl w/ Smartphone Off, PC Remote Off
- M2: Ctrl w/ Smartphone On,  PC Remote Off
- M3: Ctrl w/ Smartphone Off, PC Remote On
- M4: same as M1 (noise control)

Result: bodies 0x38..0xFFF are identical in all four files. Only header bytes differ: 0x21–0x23 and 0x2E (save time) and 0x35. Header 0x24 = 02 on all four.
Conclusion: Memory Recall does not store Ctrl w/ Smartphone or PC Remote. A colour set cannot set them.
