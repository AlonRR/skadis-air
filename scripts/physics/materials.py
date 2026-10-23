"""The three materials (Q326), each from its maker's technical data sheet, read 23 Oct 2026 (C330).

One maker for all three, Prusa Polymers (Prusament), as its sheets give values measured on printed specimens: tensile
bars printed flat ("horizontal", pulled along the roads in the layer plane) and on edge ("vertical xz"), and an
interlayer adhesion figure, its own test across the layers. All three sheets: version 1.1, last update 16-02-2022.

The runs use the horizontal column: a board prints face down (D66), so a hook's load runs in the layer plane, along
the roads; the interlayer figure is the strength across the layers, against which the stress normal to them is read.
No sheet gives a Poisson's ratio (C331).
"""

SOURCES = {
    "PLA": "https://prusament.com/wp-content/uploads/2022/10/PLA_Prusament_TDS_2021_10_EN.pdf",
    "PETG": "https://prusament.com/wp-content/uploads/2022/10/PETG_Prusament_TDS_2021_10_EN.pdf",
    "ASA": "https://prusament.com/wp-content/uploads/2022/10/ASA_Prusament_TDS_2022_16_EN.pdf",
}

# MPa; E is the printed horizontal specimens' tensile modulus (ISO 527-1), strength their tensile yield strength
# (ISO 527-1), across the maker's interlayer adhesion; HDT at 0.45 MPa (ISO 75), degrees C.
MATERIALS = {
    "PLA": {"E": 2300.0, "strength": 51.0, "strengthXZ": 59.0, "across": 17.0, "hdt": 55.0, "density": 1.24},
    "PETG": {"E": 1500.0, "strength": 47.0, "strengthXZ": 50.0, "across": 18.0, "hdt": 68.0, "density": 1.27},
    "ASA": {"E": 1600.0, "strength": 42.0, "strengthXZ": 45.0, "across": 11.0, "hdt": 93.0, "density": 1.07},
}
