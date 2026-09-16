---
date: 2026-09-16
statut: accepte
domaine: dev
tags: [dsh, rgpd, frontiere, constat, connecteurs]
remplace: ""
---
# ADR — RGPD à la frontière, pas dans l'outil

## Contexte
L'outil `constat` (itération 1) refusait toute donnée nominative dans ses champs
libres, en permanence. Emmanuel a posé le cadre cible : **modèle auto-hébergé,
donc modèle et données au même endroit**. Dans ce cadre, filtrer à l'entrée n'a
pas d'objet ; ça bride l'agent et la créativité. Aujourd'hui la route est HF
(modèle distant), mais aucune donnée réelle ne circule : ce sont des exercices.
Sa règle globale (« jamais de donnée nominative ») visait les sorties vers un
tiers et les bases partagées ; elle est ici précisée, pas contredite.

## Décision
Le filtre RGPD est une propriété de la **frontière**, pas de l'outil. Il
s'active en fonction de l'objectif ou de la sortie : au moment où une donnée
quitte le poste (export, envoi, publication), jamais à l'entrée d'un outil local.
- `constat_creer` n'applique plus de filtre sur `objet`, `preuve`, `responsable`.
  `responsable` accepte un nom ou un rôle.
- La détection (`detecterDonneePersonnelle`) reste en bibliothèque, pour un
  futur outil `exporter` qui filtrera **toujours**, quelle que soit la route.
- Les connecteurs locaux (registres, exports LGO) lisent des données réalistes,
  noms compris. En local, rien n'est anonymisé.
Écarté : une variable de politique `FRONTIERE_MODELE=distant|local` dans le
preset, qui pseudonymiserait les sorties d'outil quand le modèle est distant.
Raison : prématuré ; sur-contrainte tant qu'aucune donnée réelle ne circule.

## Conséquences
- Tant que la route est HF, **aucune donnée d'officine réelle** ne passe par
  l'agent : les registres sont simulés. L'interdit du 22/08 (inférence locale
  obligatoire pour les données réelles) est inchangé et c'est lui qui porte la
  protection, pas un filtre.
- Réouverture : le jour où un connecteur lit une donnée réelle avec un modèle
  distant, la variable de politique écartée redevient la première brique à poser.
- Trois tests unitaires de l'itération 1 changent de sens (nom, téléphone,
  date de naissance acceptés dans le constat ; refusés seulement par `exporter`).
