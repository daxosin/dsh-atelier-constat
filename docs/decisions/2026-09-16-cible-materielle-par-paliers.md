---
date: 2026-09-16
statut: accepte
domaine: dev
tags: [dsh, materiel, paliers, banc-modeles, deploiement, cout]
remplace: ""
---
# ADR — Cible matérielle par paliers, déploiement 2027–2028

## Contexte
Le banc de modèles du 16/09 comparait trois modèles servis par HF sans dire sur
quoi ils tourneraient chez un client. Emmanuel a recadré : la cible n'est pas
le poste de développement (15,5 Go, sans GPU, plafond 4–9 B), ce sont **des
machines professionnelles à paliers de budget, du « gros Mac mini » au serveur
NVIDIA, déployées dans un ou deux ans, pas avant**. Les modèles d'aujourd'hui
sont donc des témoins de classe, pas des choix. Ce qui compte au banc, c'est la
**pente** : le comportement de l'outil tient-il quand on descend de palier ?

Coûts constatés le 16/09/2026 (prix publics, TTC ou USD selon la source ; à
revérifier à l'achat, le marché GPU a bougé de +87 % en un mois) :

| Palier | Machine | Ordre de prix | Source |
|---|---|---|---|
| A | Mac mini M4 Pro 24–64 Go | à partir de 1 900 € (24 Go) ; 64 Go plus cher, non chiffré | [MacGeneration 07/2026](https://www.macg.co/mac/2026/07/le-mac-mini-m4-en-stock-et-en-promotion-avec-24-go-de-ram-1-650-eu-en-m4-pro-309963), [idealo](https://www.idealo.fr/prix/205020602/apple-mac-mini-m4-2024.html) |
| A+ | Mac Studio M4 Ultra 96–192 Go (M3 Ultra jusqu'à 512 Go) | à partir de 4 999 € ; ~7 000 € en 192 Go / 8 To | [Le Mac en ligne](https://lemacenligne.com/articles/mac-studio-m4/), [Apple FR](https://www.apple.com/fr/shop/buy-mac/mac-studio/puce-m4-max-cpu-14-c%C5%93urs-gpu-32-c%C5%93urs-36-go-m%C3%A9moire-512go-stockage), [LDLC 128 Go](https://www.ldlc.com/en/product/PB00731456.html) |
| B | Station 1 × RTX PRO 6000 Blackwell 96 Go | carte seule 15 569 € (meilleur prix FR) ; NVIDIA liste 16 000 $ depuis août 2026 (+87 %) ; station complète ≈ 20 000 € `[estimé : carte + base pro]` ; 2 cartes ≈ 36 000 € `[estimé]` | [La Bonne Config](https://labonneconfig.fr/prix-gpu/pny-nvidia-rtx-pro-6000-blackwell-generation-96-go), [GinjFo 13/08/2026](https://www.ginjfo.com/actualites/composants/cartes-graphiques/nvidia-fait-exploser-le-prix-de-sa-rtx-pro-6000-blackwell-20260813), [Thunder Compute 09/2026](https://www.thundercompute.com/blog/nvidia-rtx-pro-6000-pricing) |
| C | Serveur 4 × H200 SXM | ≈ 175 000 $ | [Mercatus](https://www.mercatus-ai.com/blog/h200-server-price) |
| C | Serveur 8 × H200 NVL (Europe) | ≈ 388 000 € HT, 470 000 € TTC | [2CRSi](https://2crsi.com/ai-server-nvidia-hgx-8-h200-gpus), [Servermall](https://servermall.com/sets/servers-with-h200/) |
| C | DGX B200 (8 × B200) | 275 000 à 515 000 $ selon revendeur | [Thunder Compute](https://www.thundercompute.com/blog/nvidia-b200-pricing), [GPU Battle](https://gpubattle.com/guides/nvidia-b200-price) |
| Location | B200 en cloud | 6 à 16 $ par GPU-heure | [Thunder Compute](https://www.thundercompute.com/blog/nvidia-b200-pricing) |

Non chiffré ici : électricité, refroidissement, maintenance, licence dsh
(rc, licence à vérifier avant tout engagement client), temps d'intégration.

## Décision
Le banc et le futur chiffrage client se lisent par **palier matériel** :

| Palier | Classe de modèle | Témoins HF du banc |
|---|---|---|
| A — Mac mini / Mac Studio, 64 à 192 Go unifiés, 2 000 à 7 000 € | 24–32 B dense ; ~100 B MoE quantifié sur 192 Go | Qwen3.8-27B ; Mistral Small 24 B |
| B — station GPU pro, 96 à 192 Go VRAM, 20 000 à 36 000 € | 70–120 B | Mistral-Small-4-119B ; gpt-oss-120b |
| C — serveur multi-GPU, 175 000 à 500 000 $ | 400 B à 1,6 T MoE | DeepSeek V4 Flash, V4 Pro |
| Hébergé en France (sans matériel) | ce que le fournisseur sert | Qwen3.8-27B et gpt-oss-120b via OVHcloud sur HF `[constaté dans la liste des providers]` |

Le palier A est la cible commerciale probable d'une officine seule ; B pour un
groupement ; C n'est pas un achat d'officine, c'est du cloud ou de la
mutualisation. Le palier « hébergé en France » est une **quatrième option**
à instruire : pas de capex, données en France, mais un tiers.

Écarté : viser le poste de développement (4–9 B) — ce n'est pas une machine
professionnelle. Écarté : figer un modèle — dans deux ans les paliers auront
monté d'un cran ; on fige des classes et une méthode de mesure.

Mistral : retenu comme témoin commercial du palier A et B (offre recevable
pour un client), pas comme argument de souveraineté (Emmanuel : « Mistral n'a
plus grand chose d'européen »).

## Conséquences
- `banc-modeles.md` gagne une colonne « palier ». Toute nouvelle ligne la
  renseigne.
- Prochains témoins à passer au banc : Mistral Small 24 B (A),
  Mistral-Small-4-119B ou gpt-oss-120b (B). Puis S4 sur tous, puis répétitions ×3.
- Les prix ci-dessus datent du 16/09/2026 et servent de point de comparaison
  daté, pas de devis. Réouverture : à chaque chiffrage client, et si le marché
  GPU se détend.
- Le chiffrage client complet (capex + opex + intégration + licence) est un
  livrable à part, non commencé.
