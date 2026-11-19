Camera reported "file error" on M1–M4 after the app wrote them (header from card 0x24=03 + template body).
Test set:
M1 = fixture hybrid-ppon-pal (header 0x24=02, known accepted earlier)        -> control: expect OK
M2 = app-written file (card header 03 + template body)                        -> suspect
M3 = camera's own file from before the write (header 03)                      -> control: expect OK
M4 = app-written file                                                          -> suspect
