---
date: 2026-09-16
statut: accepte
domaine: dev
tags: [dsh, route-modele, hugging-face, deepseek, banc-modeles]
remplace: "decisions/2026-09-16-route-modele-deepseek-officiel-v4-flash-en-test.md"
---
# ADR — Route modèle : HF reste la route, les modèles DeepSeek s'y testent

## Contexte
L'ADR du même jour (matin) retenait l'adaptateur DeepSeek officiel. À l'exécution,
constat : Emmanuel n'a **pas de compte DeepSeek**, donc pas de clé ; la route
officielle n'a jamais pu servir. Le test de bout en bout a tourné sur HF, où le
plafond est désormais 10 $ (fait le 16/09). HF sert en direct les modèles ouverts
de DeepSeek, dont le modèle frontière `DeepSeek-V4-Pro-0813` (5 fournisseurs).
Le banc `banc-modeles.md` a montré, sur un même outil, des comportements très
différents entre modèles : l'intérêt de HF est justement de les comparer.

## Décision
**Hugging Face Inference Providers reste la route** (`llm-pi-ai`, section
`hf-router` de `settings.yaml`). Les modèles DeepSeek se testent **par HF**,
en commençant par le modèle frontière `deepseek-ai/DeepSeek-V4-Pro-0813`, ajouté
au catalogue le 16/09 (nom d'affichage « DeepSeek-V4-Pro-0813 (HF, frontiere) »).
Écarté : ouvrir un compte DeepSeek pour la route officielle. Raison : pas
nécessaire tant que HF sert les mêmes poids ; l'en-tête d'identité de
l'adaptateur natif (ADR du 22/08) redevient un argument contre.
Le mot d'Emmanuel : « HF reste la route et test sur le modèle frontière de DS ».

## Conséquences
- `agent-default-model` suit ce que le sélecteur de l'UI écrit ; il n'est plus
  une décision, seulement un état. La décision, c'est le catalogue `hf-router`.
- Toute dépense passe par les crédits HF prépayés (10 $) sous le plafond de 10 $.
  Recharge = décision d'Emmanuel.
- Chaque nouveau modèle testé se déclare dans le catalogue HF **et** s'inscrit
  au banc (`banc-modeles.md`), mêmes scénarios, journal vide.
- L'ADR du matin passe en `remplace`. L'interdit sur les données d'officine via
  une route distante est inchangé (inférence locale obligatoire pour ça).
- Réouverture : si HF cesse de servir les modèles DeepSeek voulus, ou si un
  DPA devient exigible.
