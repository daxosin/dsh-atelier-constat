---
date: 2026-09-16
statut: remplace
domaine: dev
tags: [dsh, route-modele, deepseek, hugging-face]
remplace: "decisions/2026-08-22-route-modele-hugging-face.md"
---
# ADR — Route modèle : DeepSeek officiel, V4 Flash en test

## Contexte
L'ADR du 22 août avait retenu Hugging Face Inference Providers via `llm-pi-ai` et
écarté l'adaptateur DeepSeek natif à cause de son en-tête d'identité
`x-deepseek-harness-user-id`, non désactivable. Le 2 septembre, Emmanuel a
basculé lui-même le sélecteur de l'UI sur `deepseek-official / deepseek-v4-pro`
(`settings.yaml` réécrit 12:59, dérive constatée à la reprise du 16 septembre).
Le 16 septembre, il tranche : « je préfère DeepSeek et on peut tester la version
V4 Flash ». Le même jour, la limite de dépense HF est descendue de 300 $ à 10 $
(faite par Emmanuel), ce qui borne la route HF conservée en repli.

## Décision
La route par défaut de dsh est l'adaptateur **DeepSeek officiel**, modèle
**`deepseek-v4-flash`** pour la phase de test (sélectionné dans l'UI le
16 septembre ; `agent-default-model` vérifié dans `settings.yaml`). V4 Pro reste
disponible dans le sélecteur. La route HF (`llm-pi-ai`, Qwen épinglé
`:featherless-ai` et V4 Flash témoin) est **conservée en repli**, non supprimée.
Option écartée : rester sur HF par défaut — Emmanuel préfère DeepSeek ; la raison
de fond (usage, coût, qualité) n'a pas été formulée `[à compléter]`.
L'en-tête d'identité de l'adaptateur natif est **accepté en connaissance de cause**
pour la phase de test ; ce point n'a pas été rediscuté explicitement `[à compléter]`.

## Conséquences
- La route DeepSeek n'a **aucune clé** à ce jour (Settings → Models : DeepSeek en
  rouge, seul `HF_TOKEN` présent dans `.credentials.yaml`). Emmanuel doit saisir
  lui-même la clé API DeepSeek dans l'UI ; l'agent ne manipule aucun credential.
  Tant qu'elle manque, tout tour d'agent échoue.
- La dépense DeepSeek est hors du plafond HF de 10 $ : elle se surveille sur le
  compte DeepSeek, avec un plafond propre à poser `[à compléter]`.
- Interdit inchangé : aucune donnée d'officine (même agrégée) sur une route
  distante — l'ADR du 22 août posait l'inférence locale comme obligatoire pour ça.
  Constat de la reprise : la session dsh du 2 septembre (« read: CORPUS-NOYAU.md »)
  a envoyé un corpus d'officine anonymisé/agrégé à V4 Flash via HF (18 requêtes,
  Baseten et DeepInfra). À arbitrer avant la prochaine session sur ces données.
- Réouverture : si un DPA devient exigible (retour à la logique du 22 août), ou si
  le test V4 Flash échoue sur l'appel d'outil.
