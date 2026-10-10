import sys; sys.path.insert(0, "."); from app.utils.extraction import _is_negated_at, NEGATION_WINDOW, FEE_KEYWORDS; text = "there is no registration fee, application fee, training fee, security deposit, or payment required at any stage of recruitment.";
[void]0
for kw in FEE_KEYWORDS:
    pos = text.find(kw)
    if pos != -1:
        preceding = text[:pos].rstrip()
        tokens = preceding.split()
        window_tokens = tokens[-NEGATION_WINDOW:]
        window_str = " ".join(window_tokens)
        negated = _is_negated_at(text, pos)
        print(f"KW: \"{kw}\" pos={pos} negated={negated}")
        print(f"  window-{NEGATION_WINDOW}: {window_tokens}")
        print(f"  window_str: \"{window_str}\"")

