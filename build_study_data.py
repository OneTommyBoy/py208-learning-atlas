from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote

from PIL import Image
from rapidocr_onnxruntime import RapidOCR


ROOT = Path(__file__).resolve().parent
COURSE_DIR = ROOT / "PY208"
OUTPUT_PATH = ROOT / "study_app" / "course-data.json"


CHAPTER_GUIDES = {
    1: {
        "title": "Vector Review",
        "summary": "Build fluency with vector magnitude, direction, equality, and components.",
        "diagramType": "vectors",
        "objectives": [
            "Compare vectors by magnitude and direction.",
            "Read component signs from a diagram.",
            "Tell equal vectors from opposite vectors.",
        ],
        "formulas": [
            ("Magnitude", "|v| = sqrt(vx^2 + vy^2)"),
            ("Equality", "same magnitude + same direction"),
            ("Opposite", "u = -v"),
        ],
        "pitfalls": [
            "Same length does not always mean same vector.",
            "Position on the page does not define equality.",
        ],
    },
    3: {
        "title": "Coulomb's Law Review",
        "summary": "Review charge interactions, source-target vectors, and inverse-square force logic.",
        "diagramType": "charges",
        "objectives": [
            "Write displacement vectors between charges.",
            "Predict attraction versus repulsion.",
            "Use Coulomb's law with clean sign reasoning.",
        ],
        "formulas": [
            ("Force magnitude", "F = k |q1 q2| / r^2"),
            ("Field relation", "E = F / q_test"),
            ("Vector idea", "pick r_hat from source to target"),
        ],
        "pitfalls": [
            "Using the wrong displacement direction.",
            "Forgetting that electrons flip force direction relative to E.",
        ],
    },
    13: {
        "title": "Electric Field Reasoning",
        "summary": "Translate electric-field arrows into force, source-charge, and symmetry reasoning.",
        "diagramType": "field-lines",
        "objectives": [
            "Interpret E at a point.",
            "Relate E to force on positive and negative charges.",
            "Use symmetry to infer likely source locations.",
        ],
        "formulas": [
            ("Force from field", "F = q E"),
            ("Point-charge field", "E = k |q| / r^2"),
            ("Superposition", "E_net = sum(E_i)"),
        ],
        "pitfalls": [
            "Confusing the field with the force.",
            "Forgetting electrons accelerate opposite the field direction.",
        ],
    },
    14: {
        "title": "Charge and Conductors",
        "summary": "Track transferred charge and explain conductor equilibrium and polarization.",
        "diagramType": "conductor",
        "objectives": [
            "Use charge conservation.",
            "State the equilibrium rule inside a conductor.",
            "Explain induced surface charge patterns.",
        ],
        "formulas": [
            ("Conservation", "Q_initial = Q_final"),
            ("Equilibrium", "E_net = 0 inside a conductor"),
            ("Quantization", "Q = n e"),
        ],
        "pitfalls": [
            "Mixing the net field with one field contribution.",
            "Forgetting that polarization redistributes surface charge.",
        ],
    },
    15: {
        "title": "Fields from Distributed Charge",
        "summary": "Move from point charges to rods, disks, and other continuous charge distributions.",
        "diagramType": "continuous-charge",
        "objectives": [
            "Break a charged object into small elements.",
            "Use symmetry to remove canceled components.",
            "Choose between exact and approximate formulas.",
        ],
        "formulas": [
            ("Charge element", "dq = lambda dx, sigma dA, or rho dV"),
            ("Field element", "dE = k dq / r^2"),
            ("Build the answer", "E = integral(dE)"),
        ],
        "pitfalls": [
            "Keeping components that symmetry should cancel.",
            "Using far-field approximations too close to the object.",
        ],
    },
    16: {
        "title": "Electric Potential and Energy",
        "summary": "Connect fields to potential, potential energy, and motion through voltage differences.",
        "diagramType": "potential",
        "objectives": [
            "Use Delta U = q Delta V correctly.",
            "Relate electric energy changes to kinetic energy changes.",
            "Determine the sign of Delta V in plate problems.",
        ],
        "formulas": [
            ("Potential energy", "Delta U = q Delta V"),
            ("Energy conservation", "Delta K = -Delta U"),
            ("Uniform field", "Delta V = -E d cos(theta)"),
        ],
        "pitfalls": [
            "Confusing potential with potential energy.",
            "Using proton intuition for electrons without flipping signs.",
        ],
    },
    17: {
        "title": "Current and Magnetic Fields from Current",
        "summary": "Connect charge flow rates to current and to the magnetic fields made by wires.",
        "diagramType": "wire-field",
        "objectives": [
            "Convert particle flow to current.",
            "Separate electron flow from conventional current.",
            "Use the right-hand rule around a wire.",
        ],
        "formulas": [
            ("Current", "I = Delta Q / Delta t"),
            ("Charge counting", "Q = N e"),
            ("Straight wire field", "B = mu0 I / (2 pi r)"),
        ],
        "pitfalls": [
            "Dropping the electron charge in conversions.",
            "Applying the right-hand rule to electron flow instead of conventional current.",
        ],
    },
    18: {
        "title": "Steady-State Wires and Resistance",
        "summary": "Study the microscopic picture of current, internal electric fields, and resistance in wires.",
        "diagramType": "resistance",
        "objectives": [
            "Describe a metal wire in steady state.",
            "Relate field, current density, and resistivity.",
            "Use geometry when finding resistance or field.",
        ],
        "formulas": [
            ("Ohm's law", "V = I R"),
            ("Resistance", "R = rho L / A"),
            ("Current density", "J = sigma E"),
        ],
        "pitfalls": [
            "Assuming the field must be zero inside a working wire.",
            "Forgetting to turn diameter into radius for area.",
        ],
    },
    19: {
        "title": "Microscopic Conduction and RC Transients",
        "summary": "Blend conduction ideas with capacitor charge/discharge behavior and time-dependent current.",
        "diagramType": "rc",
        "objectives": [
            "Estimate the small field needed to drive current in metals.",
            "Use current density and conductivity.",
            "Interpret RC-style transient graphs.",
        ],
        "formulas": [
            ("Microscopic field", "E = J / sigma"),
            ("Current density", "J = I / A"),
            ("RC decay", "I(t) = I0 exp(-t / RC)"),
        ],
        "pitfalls": [
            "Confusing conductivity with resistivity.",
            "Expecting a linear trend when the physics is exponential.",
        ],
    },
    20: {
        "title": "Magnetic Force and Crossed Fields",
        "summary": "Work with magnetic force directions, magnitude, straight-line balance, and beam motion.",
        "diagramType": "magnetic-force",
        "objectives": [
            "Predict magnetic-force direction.",
            "Use the angle dependence in q v x B problems.",
            "Balance electric and magnetic forces when paths stay straight.",
        ],
        "formulas": [
            ("Magnetic force", "F = q v x B"),
            ("Magnitude", "|F| = |q| v B sin(theta)"),
            ("Straight path", "q E = q v B"),
        ],
        "pitfalls": [
            "Forgetting magnetic force is perpendicular to motion.",
            "Using the proton right-hand result for an electron without reversing it.",
        ],
    },
    21: {
        "title": "Flux Through Surfaces",
        "summary": "Use normals and geometry to compute electric or magnetic flux through surfaces.",
        "diagramType": "flux",
        "objectives": [
            "Use the angle to the area vector.",
            "Determine flux sign from orientation.",
            "Interpret field data across a surface.",
        ],
        "formulas": [
            ("Electric flux", "phi_E = E A cos(theta)"),
            ("Magnetic flux", "phi_B = B A cos(theta)"),
            ("General form", "phi = integral(F dot dA)"),
        ],
        "pitfalls": [
            "Using the angle to the plane instead of the normal.",
            "Ignoring which way the chosen normal points.",
        ],
    },
    22: {
        "title": "Induction and Curling Electric Fields",
        "summary": "Reason about changing magnetic flux, induced circulation, and Faraday-style direction questions.",
        "diagramType": "induction",
        "objectives": [
            "Predict clockwise versus counterclockwise induced behavior.",
            "Use Lenz reasoning to oppose flux change.",
            "Recognize that induced electric fields form loops.",
        ],
        "formulas": [
            ("Faraday's law", "loop integral(E dot dl) = - d(phi_B) / dt"),
            ("Lenz idea", "induced effect opposes flux change"),
            ("Field shape", "induced E forms loops"),
        ],
        "pitfalls": [
            "Switching viewpoint mid-problem.",
            "Using electrostatic field intuition for induction problems.",
        ],
    },
    23: {
        "title": "Electromagnetic Waves",
        "summary": "Tie together propagation direction, field orientation, wavelength, and frequency.",
        "diagramType": "em-wave",
        "objectives": [
            "Use the perpendicular E-B-propagation relationship.",
            "Convert between wavelength and frequency.",
            "Compare waves across the electromagnetic spectrum.",
        ],
        "formulas": [
            ("Wave speed", "c = f lambda"),
            ("Field ratio", "E / B = c"),
            ("Geometry", "E perp B perp propagation"),
        ],
        "pitfalls": [
            "Pointing E and B parallel instead of perpendicular.",
            "Dropping powers of ten in unit conversions.",
        ],
    },
}


FORMULA_LATEX = {
    1: {
        "Magnitude": r"|\vec{v}| = \sqrt{v_x^2 + v_y^2}",
        "Equality": r"\text{same magnitude + same direction}",
        "Opposite": r"\vec{u} = -\vec{v}",
    },
    3: {
        "Force magnitude": r"F = k \frac{|q_1 q_2|}{r^2}",
        "Field relation": r"E = \frac{F}{q_{\text{test}}}",
        "Vector idea": r"\text{pick }\hat{r}\text{ from source to target}",
    },
    13: {
        "Force from field": r"\vec{F} = q\vec{E}",
        "Point-charge field": r"E = k \frac{|q|}{r^2}",
        "Superposition": r"\vec{E}_{\text{net}} = \sum \vec{E}_i",
    },
    14: {
        "Conservation": r"Q_{\text{initial}} = Q_{\text{final}}",
        "Equilibrium": r"E_{\text{net}} = 0 \text{ inside a conductor}",
        "Quantization": r"Q = ne",
    },
    15: {
        "Charge element": r"dq = \lambda\,dx,\ \sigma\,dA,\ \text{or}\ \rho\,dV",
        "Field element": r"dE = k \frac{dq}{r^2}",
        "Build the answer": r"\vec{E} = \int d\vec{E}",
    },
    16: {
        "Potential energy": r"\Delta U = q\Delta V",
        "Energy conservation": r"\Delta K = -\Delta U",
        "Uniform field": r"\Delta V = -Ed\cos\theta",
    },
    17: {
        "Current": r"I = \frac{\Delta Q}{\Delta t}",
        "Charge counting": r"Q = Ne",
        "Straight wire field": r"B = \frac{\mu_0 I}{2\pi r}",
    },
    18: {
        "Ohm's law": r"V = IR",
        "Resistance": r"R = \rho \frac{L}{A}",
        "Current density": r"\vec{J} = \sigma \vec{E}",
    },
    19: {
        "Microscopic field": r"E = \frac{J}{\sigma}",
        "Current density": r"J = \frac{I}{A}",
        "RC decay": r"I(t) = I_0 e^{-t/(RC)}",
    },
    20: {
        "Magnetic force": r"\vec{F} = q\vec{v} \times \vec{B}",
        "Magnitude": r"|\vec{F}| = |q|vB\sin\theta",
        "Straight path": r"qE = qvB",
    },
    21: {
        "Electric flux": r"\Phi_E = EA\cos\theta",
        "Magnetic flux": r"\Phi_B = BA\cos\theta",
        "General form": r"\Phi = \int \vec{F}\cdot d\vec{A}",
    },
    22: {
        "Faraday's law": r"\oint \vec{E}\cdot d\vec{\ell} = -\frac{d\Phi_B}{dt}",
        "Lenz idea": r"\text{induced effect opposes flux change}",
        "Field shape": r"\text{induced }\vec{E}\text{ forms loops}",
    },
    23: {
        "Wave speed": r"c = f\lambda",
        "Field ratio": r"\frac{E}{B} = c",
        "Geometry": r"\vec{E} \perp \vec{B} \perp \text{propagation}",
    },
}


KNOWLEDGE_CHECKS = {
    1: [
        {
            "type": "Concept check",
            "difficulty": "Foundation",
            "prompt": "Two vectors are drawn in different places on the page but have the same magnitude and the same direction. Are they equal vectors? Explain why.",
            "checkpoints": [
                "Yes. Equal vectors must match in magnitude and direction.",
                "Their position on the page does not change the vector itself.",
            ],
            "pitfall": "Treating location on the page as part of the vector definition.",
        },
        {
            "type": "Components",
            "difficulty": "Foundation",
            "prompt": "A vector has components (-3, 4). Which quadrant does it point into, and what is its magnitude?",
            "checkpoints": [
                "Negative x and positive y means it points left and up.",
                "Its magnitude is sqrt(3^2 + 4^2) = 5.",
            ],
            "pitfall": "Dropping the signs before deciding the direction.",
        },
        {
            "type": "Comparison",
            "difficulty": "Foundation",
            "prompt": "If u = -v, what must be the same about u and v, and what must be different?",
            "checkpoints": [
                "They must have the same magnitude.",
                "They must point in exactly opposite directions.",
            ],
            "pitfall": "Calling them equal just because their lengths match.",
        },
        {
            "type": "Sign reasoning",
            "difficulty": "Core",
            "prompt": "A vector points down and to the right. What are the signs of its x and y components?",
            "checkpoints": [
                "The x component is positive because it points right.",
                "The y component is negative because it points downward.",
            ],
            "pitfall": "Using the arrow length instead of the coordinate directions to assign signs.",
        },
        {
            "type": "Compare cases",
            "difficulty": "Core",
            "prompt": "Compare v = <3,4> and w = <-3,4>. Do they have the same magnitude? Are they equal? Are they opposites?",
            "checkpoints": [
                "They have the same magnitude because both give sqrt(3^2 + 4^2) = 5.",
                "They are not equal and not opposites because only the x component changes sign.",
            ],
            "pitfall": "Assuming same magnitude automatically means equal vectors.",
        },
        {
            "type": "Explain",
            "difficulty": "Challenge",
            "prompt": "Why is it not enough to compare arrow lengths when deciding whether two vectors add to a large resultant or nearly cancel?",
            "checkpoints": [
                "Direction matters just as much as magnitude in vector addition.",
                "Two vectors with the same lengths can add, partially cancel, or fully cancel depending on their directions.",
            ],
            "pitfall": "Treating vector addition like ordinary scalar addition.",
        },
    ],
    3: [
        {
            "type": "Charge interaction",
            "difficulty": "Foundation",
            "prompt": "How do you decide whether two charges attract or repel?",
            "checkpoints": [
                "Like charges repel and unlike charges attract.",
                "The sign combination sets the direction of the force, not the distance dependence.",
            ],
            "pitfall": "Letting the inverse-square law determine attraction versus repulsion.",
        },
        {
            "type": "Vector setup",
            "difficulty": "Foundation",
            "prompt": "When using Coulomb reasoning, what direction should r_hat point?",
            "checkpoints": [
                "r_hat should point from the source charge toward the target point or target charge.",
                "That choice keeps the direction bookkeeping consistent.",
            ],
            "pitfall": "Reversing the source-to-target direction halfway through the problem.",
        },
        {
            "type": "Scaling",
            "difficulty": "Core",
            "prompt": "If the separation between two charges doubles, how does the force magnitude change?",
            "checkpoints": [
                "The force drops by a factor of 4.",
                "That follows from the 1/r^2 dependence.",
            ],
            "pitfall": "Thinking the force only gets cut in half.",
        },
        {
            "type": "Scaling",
            "difficulty": "Core",
            "prompt": "If both charge magnitudes are doubled while the distance stays the same, how does the force magnitude change?",
            "checkpoints": [
                "The force becomes 4 times larger.",
                "Doubling each charge multiplies the product q1 q2 by 4.",
            ],
            "pitfall": "Doubling only one part of the product in your head.",
        },
        {
            "type": "Newton's third law",
            "difficulty": "Core",
            "prompt": "Compare the force of q1 on q2 with the force of q2 on q1.",
            "checkpoints": [
                "They are equal in magnitude.",
                "They point in opposite directions.",
            ],
            "pitfall": "Thinking the larger charge automatically feels the larger force.",
        },
        {
            "type": "Explain",
            "difficulty": "Challenge",
            "prompt": "Why is the magnitude formula written with |q1 q2| while the sign information is handled separately?",
            "checkpoints": [
                "A magnitude must be nonnegative.",
                "The signs are still essential because they decide attraction versus repulsion and therefore the force direction.",
            ],
            "pitfall": "Mixing direction information into the magnitude step and then losing track of the sign logic.",
        },
    ],
    13: [
        {
            "type": "Definition",
            "difficulty": "Foundation",
            "prompt": "What does the electric field vector at a point tell you physically?",
            "checkpoints": [
                "It gives the force per unit positive test charge at that point.",
                "Its direction is the direction a positive test charge would accelerate.",
            ],
            "pitfall": "Describing E as the force itself instead of force per charge.",
        },
        {
            "type": "Sign reasoning",
            "difficulty": "Foundation",
            "prompt": "How does the force on a negative charge compare with the electric field direction?",
            "checkpoints": [
                "The force points opposite the field direction.",
                "That is because F = qE and q is negative.",
            ],
            "pitfall": "Using the field direction directly for electrons without flipping it.",
        },
        {
            "type": "Superposition",
            "difficulty": "Core",
            "prompt": "When several charges contribute to the field at one point, what exactly do you add?",
            "checkpoints": [
                "You add the individual electric field vectors.",
                "You must combine both magnitude and direction, not just the sizes.",
            ],
            "pitfall": "Adding field magnitudes as scalars when the directions differ.",
        },
        {
            "type": "Symmetry",
            "difficulty": "Core",
            "prompt": "At the midpoint between two identical positive charges, what is the net electric field along the line joining them?",
            "checkpoints": [
                "It is zero at the midpoint.",
                "The two fields have equal magnitude there and point in opposite directions along the connecting line.",
            ],
            "pitfall": "Thinking both fields point away from the midpoint in the same direction.",
        },
        {
            "type": "Field lines",
            "difficulty": "Core",
            "prompt": "What does it mean when electric field lines are drawn more densely in one region than another?",
            "checkpoints": [
                "The field is stronger in the denser region.",
                "The line density is a visual cue for field magnitude.",
            ],
            "pitfall": "Treating the drawing as decorative instead of quantitative.",
        },
        {
            "type": "Inference",
            "difficulty": "Challenge",
            "prompt": "If field arrows point inward toward a source from all directions, what does that suggest about the sign of the source charge?",
            "checkpoints": [
                "The source is negative.",
                "Field lines terminate on negative charges and originate on positive charges.",
            ],
            "pitfall": "Reversing the source sign because you picture force on an electron instead of the field itself.",
        },
    ],
    14: [
        {
            "type": "Conservation",
            "difficulty": "Foundation",
            "prompt": "If charge is transferred from one object to another, what conservation statement must stay true for the whole system?",
            "checkpoints": [
                "The total charge before transfer equals the total charge after transfer.",
                "Charge can move between objects but is not created or destroyed in the process.",
            ],
            "pitfall": "Tracking only one object and forgetting the rest of the system.",
        },
        {
            "type": "Equilibrium",
            "difficulty": "Foundation",
            "prompt": "What is the electric field inside a conductor in electrostatic equilibrium, and why?",
            "checkpoints": [
                "The net electric field inside is zero.",
                "Free charges move until internal forces cancel and no further rearrangement is needed.",
            ],
            "pitfall": "Assuming there can still be a steady nonzero electrostatic field inside a conductor at equilibrium.",
        },
        {
            "type": "Polarization",
            "difficulty": "Core",
            "prompt": "A neutral conductor is brought near a positive external rod. How do the charges in the conductor rearrange?",
            "checkpoints": [
                "Negative charge shifts toward the nearby positive rod.",
                "Positive charge is left on the far side, so the conductor polarizes even if its net charge stays zero.",
            ],
            "pitfall": "Calling the conductor positively charged overall just because one side becomes positive.",
        },
        {
            "type": "Surface charge",
            "difficulty": "Core",
            "prompt": "Where does excess charge reside on a conductor in electrostatic equilibrium?",
            "checkpoints": [
                "Excess charge resides on the surface.",
                "That arrangement is consistent with zero field inside the conducting material.",
            ],
            "pitfall": "Spreading excess charge uniformly through the conductor's interior.",
        },
        {
            "type": "Quantization",
            "difficulty": "Core",
            "prompt": "What does the statement Q = n e mean physically?",
            "checkpoints": [
                "Net charge comes in integer multiples of the elementary charge e.",
                "The integer n counts how many elementary charges have been added or removed.",
            ],
            "pitfall": "Treating n as something that can be any arbitrary real number.",
        },
        {
            "type": "Explain",
            "difficulty": "Challenge",
            "prompt": "Why can the electric field be zero inside a conductor while still being nonzero just outside its surface?",
            "checkpoints": [
                "The conductor's surface charges rearrange to cancel the interior field.",
                "Those same surface charges can still create an external field in the surrounding space.",
            ],
            "pitfall": "Extending the inside-the-conductor rule to the outside region.",
        },
    ],
    15: [
        {
            "type": "Setup",
            "difficulty": "Foundation",
            "prompt": "When do you use dq = lambda dx, dq = sigma dA, and dq = rho dV?",
            "checkpoints": [
                "Use lambda dx for line charge, sigma dA for surface charge, and rho dV for volume charge.",
                "The choice depends on how the charge is distributed geometrically.",
            ],
            "pitfall": "Using the same dq expression for every geometry.",
        },
        {
            "type": "Symmetry",
            "difficulty": "Foundation",
            "prompt": "Why do symmetry arguments usually come before the integral in distributed-charge problems?",
            "checkpoints": [
                "They show which field components cancel.",
                "They reduce the integral to only the components that survive.",
            ],
            "pitfall": "Keeping every component even when symmetry says some must vanish.",
        },
        {
            "type": "Geometry",
            "difficulty": "Core",
            "prompt": "On the axis of a symmetric ring or disk, which field components cancel and which remain?",
            "checkpoints": [
                "Sideways components cancel by symmetry.",
                "Only the axial component remains.",
            ],
            "pitfall": "Adding radial components that should cancel pairwise.",
        },
        {
            "type": "Approximation",
            "difficulty": "Core",
            "prompt": "How does a finite charged object behave when you observe it from very far away compared with its size?",
            "checkpoints": [
                "It often behaves approximately like a point charge with total charge Q.",
                "That approximation works when the observation distance is much larger than the object's size.",
            ],
            "pitfall": "Applying the far-field approximation too close to the object.",
        },
        {
            "type": "Integral reasoning",
            "difficulty": "Core",
            "prompt": "Why is it usually wrong to integrate only the magnitudes dE from each charge element?",
            "checkpoints": [
                "The direction of each dE can change across the object.",
                "You must integrate components or vectors so cancellation is handled correctly.",
            ],
            "pitfall": "Adding all contributions as positive scalars.",
        },
        {
            "type": "Explain",
            "difficulty": "Challenge",
            "prompt": "What geometric comparison tells you whether an exact result or an approximation is safer for a distributed-charge problem?",
            "checkpoints": [
                "Compare the observation distance with the size of the charged object.",
                "If those scales are not strongly separated, you usually need the exact geometry rather than a shortcut approximation.",
            ],
            "pitfall": "Using a convenient formula just because it looks familiar.",
        },
    ],
    16: [
        {
            "type": "Definition",
            "difficulty": "Foundation",
            "prompt": "What is the difference between electric potential V and electric potential energy U?",
            "checkpoints": [
                "Potential V is energy per unit charge.",
                "Potential energy U depends on both the potential difference and the specific charge placed there.",
            ],
            "pitfall": "Using V and U as if they were the same quantity.",
        },
        {
            "type": "Sign reasoning",
            "difficulty": "Foundation",
            "prompt": "If a positive charge moves through a positive Delta V, what happens to its electric potential energy?",
            "checkpoints": [
                "Its potential energy increases because Delta U = q Delta V.",
                "For a positive charge, the sign of Delta U matches the sign of Delta V.",
            ],
            "pitfall": "Changing the sign just because the charge is moving.",
        },
        {
            "type": "Electron reasoning",
            "difficulty": "Core",
            "prompt": "An electron moves to a region of higher electric potential. What happens to its electric potential energy and, if no other work is done, its kinetic energy?",
            "checkpoints": [
                "Its electric potential energy decreases because q is negative.",
                "Its kinetic energy increases if energy is conserved.",
            ],
            "pitfall": "Using proton intuition for an electron without flipping the sign logic.",
        },
        {
            "type": "Field relation",
            "difficulty": "Core",
            "prompt": "In a uniform electric field, how does electric potential change as you move in the direction of E?",
            "checkpoints": [
                "Potential decreases in the direction of the field.",
                "That is why Delta V carries a minus sign in the field relation.",
            ],
            "pitfall": "Assuming the field points toward higher potential because the word potential sounds like stored energy.",
        },
        {
            "type": "Scaling",
            "difficulty": "Core",
            "prompt": "If the same Delta V acts on twice as much charge, how does Delta U change?",
            "checkpoints": [
                "Delta U doubles.",
                "The change scales linearly with q in Delta U = q Delta V.",
            ],
            "pitfall": "Treating Delta V like it already includes the charge amount.",
        },
        {
            "type": "Explain",
            "difficulty": "Challenge",
            "prompt": "Why can the same potential difference make a proton slow down while making an electron speed up?",
            "checkpoints": [
                "The sign of q changes the sign of Delta U.",
                "Because Delta K = -Delta U, opposite-sign charges can gain and lose kinetic energy in opposite ways across the same Delta V.",
            ],
            "pitfall": "Thinking the potential difference alone determines the motion without the charge sign.",
        },
    ],
    17: [
        {
            "type": "Definition",
            "difficulty": "Foundation",
            "prompt": "What does electric current measure, and how does conventional current compare with electron flow?",
            "checkpoints": [
                "Current measures the rate of charge flow, Delta Q / Delta t.",
                "Conventional current points in the direction positive charge would move, opposite actual electron drift in a metal.",
            ],
            "pitfall": "Drawing current in the same direction the electrons move by default.",
        },
        {
            "type": "Charge counting",
            "difficulty": "Foundation",
            "prompt": "If N electrons pass through a cross section each second, how do you get the current magnitude?",
            "checkpoints": [
                "Multiply the number of electrons per second by e to get charge per second.",
                "The current magnitude is N e per second.",
            ],
            "pitfall": "Forgetting to include the elementary charge when converting particles to current.",
        },
        {
            "type": "Right-hand rule",
            "difficulty": "Core",
            "prompt": "How do you use the right-hand rule for the magnetic field around a straight current-carrying wire?",
            "checkpoints": [
                "Point your thumb in the direction of the conventional current.",
                "Your curled fingers show the magnetic field direction around the wire.",
            ],
            "pitfall": "Using electron motion instead of conventional current for the thumb direction.",
        },
        {
            "type": "Scaling",
            "difficulty": "Core",
            "prompt": "If the current doubles and the observation distance from a long straight wire is cut in half, how does the magnetic field change?",
            "checkpoints": [
                "The field becomes 4 times larger.",
                "One factor of 2 comes from I and another from the 1/r dependence.",
            ],
            "pitfall": "Remembering only one of the two changes.",
        },
        {
            "type": "Explain",
            "difficulty": "Core",
            "prompt": "Why is it dangerous to apply the standard right-hand rule directly to electron flow in a metal wire?",
            "checkpoints": [
                "The standard rule is defined for conventional current, not electron drift.",
                "If you use electron motion directly, you reverse the magnetic field direction by mistake.",
            ],
            "pitfall": "Assuming the mnemonic works the same way for any moving charge picture.",
        },
        {
            "type": "Field geometry",
            "difficulty": "Challenge",
            "prompt": "Two points are the same distance from a long straight wire but lie at different angles around it. How do their magnetic field magnitudes compare?",
            "checkpoints": [
                "Their magnetic field magnitudes are the same.",
                "For a long straight wire, B depends only on the radial distance from the wire, not the angular position around it.",
            ],
            "pitfall": "Expecting different magnitudes because the field direction changes around the circle.",
        },
    ],
    18: [
        {
            "type": "Microscopic model",
            "difficulty": "Foundation",
            "prompt": "Why can a metal wire carrying steady current still have a nonzero electric field inside it?",
            "checkpoints": [
                "The internal electric field is what pushes charges and maintains the drift motion.",
                "Steady current means the situation is stable in time, not that the driving field has vanished.",
            ],
            "pitfall": "Borrowing the electrostatic-conductor rule and forcing E = 0 inside a working wire.",
        },
        {
            "type": "Scaling",
            "difficulty": "Foundation",
            "prompt": "If a wire's length doubles while the material and cross-sectional area stay the same, what happens to its resistance?",
            "checkpoints": [
                "The resistance doubles.",
                "Resistance is proportional to length in R = rho L / A.",
            ],
            "pitfall": "Changing the resistance in the wrong direction because the wire looks more spread out.",
        },
        {
            "type": "Geometry",
            "difficulty": "Core",
            "prompt": "If a wire's radius doubles while the material and length stay the same, what happens to its resistance?",
            "checkpoints": [
                "The cross-sectional area becomes 4 times larger.",
                "The resistance becomes one fourth as large.",
            ],
            "pitfall": "Doubling the area instead of using A = pi r^2.",
        },
        {
            "type": "Definition",
            "difficulty": "Core",
            "prompt": "What does current density J tell you physically?",
            "checkpoints": [
                "It is the current per unit cross-sectional area.",
                "It tells you how concentrated the current flow is through the material.",
            ],
            "pitfall": "Using total current and current density interchangeably.",
        },
        {
            "type": "Compare cases",
            "difficulty": "Core",
            "prompt": "Two wires are made of the same material and carry the same current, but one is thinner. Which wire has the larger current density and internal electric field?",
            "checkpoints": [
                "The thinner wire has the larger current density because the same current passes through less area.",
                "For the same material, the larger J means the thinner wire also has the larger internal electric field.",
            ],
            "pitfall": "Thinking same current guarantees same microscopic conditions.",
        },
        {
            "type": "Explain",
            "difficulty": "Challenge",
            "prompt": "How can a wire be electrically neutral overall while still carrying current?",
            "checkpoints": [
                "The moving electrons and the positive lattice still balance to nearly zero net charge overall.",
                "Current is about charge motion, not necessarily about net charge buildup.",
            ],
            "pitfall": "Assuming current requires a wire to become strongly charged.",
        },
    ],
    19: [
        {
            "type": "Definition",
            "difficulty": "Foundation",
            "prompt": "What is the relationship between current I, area A, and current density J?",
            "checkpoints": [
                "J = I / A.",
                "Current density increases when the same current is forced through a smaller area.",
            ],
            "pitfall": "Multiplying by area instead of dividing by it.",
        },
        {
            "type": "Microscopic model",
            "difficulty": "Foundation",
            "prompt": "How do you connect current density to the electric field inside a conductor?",
            "checkpoints": [
                "Use E = J / sigma.",
                "For a given conductivity, larger J requires a larger internal electric field.",
            ],
            "pitfall": "Swapping conductivity with resistivity or putting sigma in the numerator.",
        },
        {
            "type": "Graph reasoning",
            "difficulty": "Core",
            "prompt": "What shape should you expect for the current in a simple RC decay or charging process: linear or exponential?",
            "checkpoints": [
                "The time dependence is exponential.",
                "The current changes rapidly at first and then levels off rather than following a straight line.",
            ],
            "pitfall": "Expecting a constant-slope line because the graph starts steeply.",
        },
        {
            "type": "Initial behavior",
            "difficulty": "Core",
            "prompt": "During capacitor charging, how do the current and stored charge behave right after the circuit is connected and then long after?",
            "checkpoints": [
                "The current starts at its maximum value and then decreases.",
                "The capacitor charge starts from its initial value and rises toward its final value.",
            ],
            "pitfall": "Thinking both current and stored charge decrease together.",
        },
        {
            "type": "Time constant",
            "difficulty": "Core",
            "prompt": "What qualitative effect does increasing either R or C have on the time constant RC?",
            "checkpoints": [
                "It makes the time constant larger.",
                "A larger time constant means slower charging and slower decay.",
            ],
            "pitfall": "Assuming a larger R or C makes the process faster because the formula looks larger.",
        },
        {
            "type": "Explain",
            "difficulty": "Challenge",
            "prompt": "Why is an exponential model more appropriate than a linear model for RC current?",
            "checkpoints": [
                "The rate of change depends on how far the system still is from equilibrium.",
                "As the capacitor approaches its final state, the current naturally shrinks, so the slope does not stay constant.",
            ],
            "pitfall": "Forcing a constant-rate picture onto a feedback process.",
        },
    ],
    20: [
        {
            "type": "Direction",
            "difficulty": "Foundation",
            "prompt": "How is the magnetic force direction related to the velocity direction and magnetic field direction?",
            "checkpoints": [
                "The magnetic force is perpendicular to both v and B.",
                "Its direction is set by the cross product and the sign of the charge.",
            ],
            "pitfall": "Drawing the force parallel to v or parallel to B.",
        },
        {
            "type": "Zero-force case",
            "difficulty": "Foundation",
            "prompt": "When is the magnetic force on a moving charge zero even if the field is nonzero?",
            "checkpoints": [
                "It is zero if the velocity is parallel or antiparallel to the magnetic field.",
                "It is also zero if the charge is not moving.",
            ],
            "pitfall": "Thinking any nonzero field automatically causes a magnetic force.",
        },
        {
            "type": "Sign reasoning",
            "difficulty": "Core",
            "prompt": "If a proton and an electron move through the same v and B, how do their magnetic force directions compare?",
            "checkpoints": [
                "They point in opposite directions.",
                "The electron reverses the right-hand-rule result because its charge is negative.",
            ],
            "pitfall": "Using the same right-hand answer for both particles.",
        },
        {
            "type": "Crossed fields",
            "difficulty": "Core",
            "prompt": "What condition must hold if a charged particle travels in a straight line through crossed electric and magnetic fields?",
            "checkpoints": [
                "The electric and magnetic forces must be equal in magnitude.",
                "They must also point in opposite directions so the net force is zero.",
            ],
            "pitfall": "Matching the magnitudes but forgetting the directions must oppose.",
        },
        {
            "type": "Energy reasoning",
            "difficulty": "Core",
            "prompt": "Why can a magnetic field curve a particle's path without changing its kinetic energy?",
            "checkpoints": [
                "The magnetic force is always perpendicular to the velocity.",
                "A perpendicular force changes direction of motion but does no work on the particle.",
            ],
            "pitfall": "Assuming any force must automatically speed up or slow down the particle.",
        },
        {
            "type": "Angle dependence",
            "difficulty": "Challenge",
            "prompt": "How does the angle between v and B affect the magnetic force magnitude?",
            "checkpoints": [
                "The force magnitude follows sin(theta).",
                "It is largest at 90 degrees and zero at 0 degrees or 180 degrees.",
            ],
            "pitfall": "Using cos(theta) because the field and velocity are drawn side by side.",
        },
    ],
    21: [
        {
            "type": "Geometry",
            "difficulty": "Foundation",
            "prompt": "Which angle do you use in flux problems: the angle to the surface itself or the angle to the surface normal?",
            "checkpoints": [
                "Use the angle between the field and the area vector (the normal).",
                "That is the angle that belongs in the cosine factor.",
            ],
            "pitfall": "Using the angle to the plane without converting to the normal angle.",
        },
        {
            "type": "Zero-flux case",
            "difficulty": "Foundation",
            "prompt": "When is the flux through a flat surface zero even though the field is nonzero?",
            "checkpoints": [
                "Flux is zero when the field is parallel to the surface.",
                "In that case the field is perpendicular to the area vector, so cos(theta) = 0.",
            ],
            "pitfall": "Thinking any nonzero field through a region must produce nonzero flux.",
        },
        {
            "type": "Sign reasoning",
            "difficulty": "Core",
            "prompt": "What happens to the sign of the flux if you reverse the chosen surface normal?",
            "checkpoints": [
                "The sign reverses.",
                "The physical situation is unchanged, but the bookkeeping convention changes.",
            ],
            "pitfall": "Changing the sign of the field instead of the sign of the area vector.",
        },
        {
            "type": "Scaling",
            "difficulty": "Core",
            "prompt": "If the field strength doubles while the area and angle stay fixed, what happens to the flux magnitude?",
            "checkpoints": [
                "The flux magnitude doubles.",
                "Flux is proportional to field strength when the geometry is unchanged.",
            ],
            "pitfall": "Overcomplicating a direct proportionality.",
        },
        {
            "type": "Closed surfaces",
            "difficulty": "Core",
            "prompt": "Why is the net magnetic flux through a closed surface always zero?",
            "checkpoints": [
                "Magnetic field lines do not start or end on isolated magnetic charges.",
                "Whatever magnetic field enters a closed surface must also leave it.",
            ],
            "pitfall": "Confusing zero net flux with zero magnetic field everywhere on the surface.",
        },
        {
            "type": "Explain",
            "difficulty": "Challenge",
            "prompt": "How can a closed surface have nonzero magnetic field on many patches and still have zero net magnetic flux?",
            "checkpoints": [
                "Local contributions can be nonzero while positive and negative flux contributions cancel overall.",
                "Net flux is a whole-surface statement, not a statement about each patch individually.",
            ],
            "pitfall": "Reading a net-zero result as a local-zero result.",
        },
    ],
    22: [
        {
            "type": "Condition",
            "difficulty": "Foundation",
            "prompt": "What must change in order to produce induction in a loop: the magnetic field, the flux, or either one?",
            "checkpoints": [
                "What matters directly is a change in magnetic flux through the loop.",
                "That flux can change because B changes, the loop area changes, or the loop orientation changes.",
            ],
            "pitfall": "Thinking only a changing field magnitude can cause induction.",
        },
        {
            "type": "Lenz reasoning",
            "difficulty": "Foundation",
            "prompt": "What does Lenz's law say the induced effect tries to oppose?",
            "checkpoints": [
                "It opposes the change in magnetic flux.",
                "It does not simply oppose the existing magnetic field no matter what the field is doing.",
            ],
            "pitfall": "Leaving out the word change and getting the induced direction wrong.",
        },
        {
            "type": "Direction",
            "difficulty": "Core",
            "prompt": "If magnetic flux into the page is increasing through a loop, what kind of induced magnetic field must the loop create?",
            "checkpoints": [
                "The induced field must point out of the page.",
                "That induced field opposes the increase in into-the-page flux.",
            ],
            "pitfall": "Matching the change instead of opposing it.",
        },
        {
            "type": "Changing geometry",
            "difficulty": "Core",
            "prompt": "Can a loop experience induction if the magnetic field is constant in time? Explain.",
            "checkpoints": [
                "Yes, if the loop area changes or the loop rotates so the flux changes.",
                "Induction responds to changing flux, not just changing field magnitude.",
            ],
            "pitfall": "Equating constant B with constant flux automatically.",
        },
        {
            "type": "Field shape",
            "difficulty": "Core",
            "prompt": "How is an induced electric field shaped differently from the electrostatic field around isolated charges?",
            "checkpoints": [
                "Induced electric fields form closed loops.",
                "Electrostatic fields from charges begin on positive charge and end on negative charge rather than looping by themselves.",
            ],
            "pitfall": "Assuming all electric fields must point radially toward or away from charges.",
        },
        {
            "type": "Explain",
            "difficulty": "Challenge",
            "prompt": "Why can a loop have an emf even when there is no battery in the circuit?",
            "checkpoints": [
                "A changing magnetic flux creates a non-electrostatic electric field around the loop.",
                "That curling electric field can drive charges and produce emf without chemical sources.",
            ],
            "pitfall": "Treating emf as something only a battery can provide.",
        },
    ],
    23: [
        {
            "type": "Geometry",
            "difficulty": "Foundation",
            "prompt": "How are E, B, and the direction of propagation oriented in an electromagnetic wave?",
            "checkpoints": [
                "The electric field, magnetic field, and propagation direction are all mutually perpendicular.",
                "The wave travels in the direction of E cross B.",
            ],
            "pitfall": "Drawing E and B parallel to each other.",
        },
        {
            "type": "Wave relation",
            "difficulty": "Foundation",
            "prompt": "If an electromagnetic wave keeps the same speed c but its frequency doubles, what happens to its wavelength?",
            "checkpoints": [
                "The wavelength is cut in half.",
                "That follows from c = f lambda.",
            ],
            "pitfall": "Doubling both frequency and wavelength at the same time.",
        },
        {
            "type": "Direction",
            "difficulty": "Core",
            "prompt": "Given the directions of E and B, how do you determine the direction the wave travels?",
            "checkpoints": [
                "Use the cross product direction E x B.",
                "The propagation direction must be perpendicular to both fields.",
            ],
            "pitfall": "Guessing the travel direction from whichever field looks larger in the sketch.",
        },
        {
            "type": "Field ratio",
            "difficulty": "Core",
            "prompt": "What does the relation E / B = c tell you about the electric and magnetic parts of the same wave?",
            "checkpoints": [
                "Their magnitudes are linked by a fixed ratio in vacuum.",
                "If one field amplitude changes, the other must change consistently with the same wave speed.",
            ],
            "pitfall": "Treating E and B as independent knobs for the same plane wave.",
        },
        {
            "type": "Medium effect",
            "difficulty": "Core",
            "prompt": "If a material has index of refraction n = c / v, what does a larger n mean for wave speed in that material?",
            "checkpoints": [
                "A larger n means a smaller speed v.",
                "The wave travels more slowly in the material than in vacuum.",
            ],
            "pitfall": "Thinking a larger index means the wave moves faster because the number is larger.",
        },
        {
            "type": "Refraction reasoning",
            "difficulty": "Challenge",
            "prompt": "When light enters a slower medium, what happens to its frequency and wavelength?",
            "checkpoints": [
                "The frequency stays the same across the boundary.",
                "The wavelength decreases because the speed decreases while c = f lambda still links them.",
            ],
            "pitfall": "Changing frequency and wavelength together without checking which quantity is set by the source.",
        },
    ],
}


def formula_payloads(chapter: int, guide: dict) -> list[dict]:
    latex_map = FORMULA_LATEX.get(chapter, {})
    return [
        {
            "label": label,
            "equation": equation,
            "latex": latex_map.get(label),
            "note": guide["summary"],
        }
        for label, equation in guide["formulas"]
    ]


def knowledge_check_payloads(chapter: int) -> list[dict]:
    return [
        {
            "label": f"KC{index:02d}",
            "type": item["type"],
            "difficulty": item["difficulty"],
            "prompt": item["prompt"],
            "checkpoints": item["checkpoints"],
            "pitfall": item["pitfall"],
        }
        for index, item in enumerate(KNOWLEDGE_CHECKS.get(chapter, []), start=1)
    ]


NOISE_BITS = [
    "you've completed all of the work in this assignment",
    "question ",
    "policies",
    "attempt history",
    "your answer",
    "correct answer",
    "your answer is correct",
    "save for later",
    "submit answer",
    "attempts:",
    "using multiple attempts",
    "score reduction after attempt",
    "current attempt in progress",
    "etextbook and media",
]


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "item"


def parse_assignment_name(name: str) -> tuple[int, int, str]:
    match = re.match(r"CH(\d+)\s+HW(\d+)(?:\s+(.*))?$", name, flags=re.IGNORECASE)
    if not match:
        raise ValueError(f"Unsupported assignment folder name: {name}")
    chapter = int(match.group(1))
    homework = int(match.group(2))
    suffix = (match.group(3) or "").strip()
    return chapter, homework, suffix


def quoted_rel_url(path: Path) -> str:
    parts = path.relative_to(ROOT).parts
    return "../" + "/".join(quote(part) for part in parts)


def clean_line(text: str) -> str:
    text = text.replace("\u2019", "'").replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\u00a0", " ")
    return re.sub(r"\s+", " ", text).strip(" -")


def skip_line(line: str, assignment_name: str) -> bool:
    lowered = line.lower()
    if not lowered or lowered == assignment_name.lower():
        return True
    if any(bit in lowered for bit in NOISE_BITS):
        return True
    if re.fullmatch(r"\d+\s*/\s*\d+", lowered):
        return True
    if re.fullmatch(r"[a-z]?\d+(\.\d+)?([eE][+-]?\d+)?", lowered):
        return True
    return False


def dedupe(items: list[str]) -> list[str]:
    seen = set()
    kept: list[str] = []
    for item in items:
        if item not in seen:
            kept.append(item)
            seen.add(item)
    return kept


def excerpt_from(lines: list[str]) -> str:
    for line in lines:
        if "?" in line and len(line) >= 28:
            return line
    for line in lines:
        if len(line) >= 40:
            return line
    return lines[0] if lines else "Open the screenshot to study this question."


def infer_focus(chapter: int, excerpt: str) -> str:
    guide = CHAPTER_GUIDES[chapter]
    if excerpt and excerpt != "Open the screenshot to study this question.":
        return excerpt
    return guide["summary"]


def ocr_question(ocr: RapidOCR, image_path: Path, assignment_name: str) -> dict:
    result, _ = ocr(str(image_path))
    raw_lines: list[str] = []
    if result:
        for item in result:
            line = clean_line(item[1])
            if skip_line(line, assignment_name):
                continue
            raw_lines.append(line)

    lines = dedupe(raw_lines)
    with Image.open(image_path) as image:
        width, height = image.size

    return {
        "fileName": image_path.name,
        "assetUrl": quoted_rel_url(image_path),
        "relativePath": image_path.relative_to(ROOT).as_posix(),
        "width": width,
        "height": height,
        "lineCount": len(lines),
        "excerpt": excerpt_from(lines),
        "transcript": "\n".join(lines),
    }


def build_course_data() -> dict:
    if not COURSE_DIR.exists():
        raise FileNotFoundError(f"Missing course folder: {COURSE_DIR}")

    ocr = RapidOCR()
    assignment_folders = sorted(
        [path for path in COURSE_DIR.iterdir() if path.is_dir()],
        key=lambda path: parse_assignment_name(path.name)[:2],
    )

    chapters_map: defaultdict[int, list[dict]] = defaultdict(list)
    assignments: list[dict] = []
    tree_folders: list[dict] = []
    total_questions = 0

    for folder in assignment_folders:
        chapter, homework, suffix = parse_assignment_name(folder.name)
        guide = CHAPTER_GUIDES[chapter]
        questions: list[dict] = []
        files: list[dict] = []

        for index, image_path in enumerate(sorted(folder.glob("question-*.png")), start=1):
            question = ocr_question(ocr, image_path, folder.name)
            question["index"] = index
            question["label"] = f"Question {index:02d}"
            question["anchor"] = f"{slugify(folder.name)}-question-{index:02d}"
            questions.append(question)
            files.append({"name": image_path.name, "index": index, "anchor": question["anchor"]})

        focus = infer_focus(chapter, questions[0]["excerpt"] if questions else "")
        assignment = {
            "name": folder.name,
            "slug": slugify(folder.name),
            "chapterNumber": chapter,
            "chapterKey": f"ch{chapter:02d}",
            "chapterTitle": guide["title"],
            "homeworkNumber": homework,
            "suffix": suffix,
            "focus": focus,
            "spotlight": guide["summary"],
            "tags": [guide["title"], chapter and f"CH{chapter}", f"HW{homework}"],
            "studySteps": guide["objectives"],
            "questionCount": len(questions),
            "folderPath": f"PY208/{folder.name}",
            "coverImage": questions[0]["assetUrl"] if questions else "",
            "coverExcerpt": questions[0]["excerpt"] if questions else "",
            "questions": questions,
        }
        assignments.append(assignment)
        chapters_map[chapter].append(assignment)
        tree_folders.append(
            {
                "name": folder.name,
                "slug": assignment["slug"],
                "chapterNumber": chapter,
                "homeworkNumber": homework,
                "questionCount": len(questions),
                "files": files,
            }
        )
        total_questions += len(questions)

    chapters: list[dict] = []
    for chapter in sorted(chapters_map):
        guide = CHAPTER_GUIDES[chapter]
        chapter_assignments = chapters_map[chapter]
        chapters.append(
            {
                "key": f"ch{chapter:02d}",
                "number": chapter,
                "title": guide["title"],
                "summary": guide["summary"],
                "diagramType": guide["diagramType"],
                "learningObjectives": guide["objectives"],
                "formulaBoard": formula_payloads(chapter, guide),
                "knowledgeChecks": knowledge_check_payloads(chapter),
                "studyChecklist": guide["objectives"],
                "pitfalls": guide["pitfalls"],
                "assignmentCount": len(chapter_assignments),
                "questionCount": sum(item["questionCount"] for item in chapter_assignments),
                "assignments": chapter_assignments,
            }
        )

    return {
        "generatedAt": datetime.now(UTC).isoformat(),
        "courseTitle": "PY208 Learning Atlas",
        "courseRoot": "PY208",
        "stats": {
            "chapterCount": len(chapters),
            "assignmentCount": len(assignments),
            "questionCount": total_questions,
        },
        "tree": {"name": "PY208", "folders": tree_folders},
        "chapters": chapters,
        "assignments": assignments,
    }


def write_course_data(output_path: Path = OUTPUT_PATH) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = build_course_data()
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return output_path


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    output_path = write_course_data()
    print(f"Study data written to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
