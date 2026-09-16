# Spec — Outil « constat » (serveur MCP local) et preset `atelier` pour dsh

**16 septembre 2026.** Issu du brainstorm du jour. Statut : validé section par
section par Emmanuel, en attente de sa relecture du fichier.

## 1. Objectif

Apprendre à construire un harness sur mesure en écrivant et en branchant **un**
outil du produit, puis en le tenant en laisse. Court terme : exercice, zéro donnée
réelle. Moyen terme : le même outil doit rester transposable sur une machine
locale avec un LLM local, livrable à une officine tierce.

Ce que ce n'est pas : un agent métier, un connecteur vers un service en ligne,
un plugin communautaire installé ou recopié (posture du 22/08).

## 2. L'outil : serveur MCP `constat`

Emplacement : `~/dsh-lab/outils/constat/` (bac à sable git existant).
Runtime : Node, transport stdio. Dépendance unique : `@modelcontextprotocol/sdk`
(bibliothèque standard, pas un plugin dsh).

### Outils exposés

| Outil | Rôle | Champs obligatoires |
|---|---|---|
| `constat_creer` | Propose un constat qualité | `objet` (texte), `preuve` (liste, ≥ 1 élément, chaque élément = source vérifiable), `responsable` (rôle, jamais un nom), `echeance` (date ISO) |
| `constat_lister` | Liste les constats et leur statut | aucun |

Il n'existe **pas** d'outil de validation exposé au modèle.

### Règles portées par le schéma, pas par la consigne

- Appel sans `preuve` → rejeté par la validation du schéma, avec un message
  qui nomme le champ manquant.
- Tout champ libre passe un filtre RGPD : motif de nom propre suivi d'un
  prénom, numéro de téléphone (06/07, +33), date de naissance → rejeté.
  Compteurs et rôles seulement.
- `responsable` est contraint à une liste de rôles (`pharmacien-titulaire`,
  `pharmacien-adjoint`, `preparateur`, `qualite`).

### État et auditabilité

- Identifiants déterministes `constat-<n>`, n = compteur par journal.
- Journal append-only `journal.jsonl` dans le dossier du serveur : une ligne par
  événement (`cree`, `valide`). L'état courant se **rejoue** depuis le journal
  au démarrage ; aucun état n'est stocké à part.
- Statuts : `propose` → `valide`. Le passage se fait **uniquement** par
  `node valider.js <id>`, commande tapée par un humain hors de l'agent.
  Le juge trie, l'humain signe.

## 3. Le branchement : preset `atelier`

Emplacement : `~/.dsh/.agent-presets/atelier/` (`preset.yml` + `agent.cordis.yml`).
Autorat par copie : partir du preset livré `cordis`, retirer, ne rien écrire à
partir de rien. Les valeurs de `preset.yml` sont citées (piège du 22/08).

Composition retenue :

- `tool-fs`, `tool-fs-search` — lecture.
- Une entrée `@deepseek-ai/dsh-mcp-client` : `serverName: constat`,
  `transport: stdio`, `command: node`, `args: ['serveur.js']`,
  `cwd: <chemin absolu de ~/dsh-lab/outils/constat>`.
- Instructions : rôle en deux phrases. Aucune règle de preuve dans la consigne,
  volontairement : le schéma doit suffire.

Retirés : `tool-bash`, `tool-pwsh`, `tool-web`, sous-agents, plan-mode,
workflow. Catalogue au premier appel : quatre outils.

Ne bougent pas : `~/.dsh/profiles/web/cordis.patch.yml` (patch du sélecteur
seul), preset `fleet`, `settings.yaml` hors sélection de modèle.

## 4. Le contrôle, dans l'ordre d'Emmanuel

| Priorité | Contrôle | Mécanisme | Limite connue |
|---|---|---|---|
| B | Demander avant de faire | Porté par l'outil : l'agent ne peut que proposer ; validation humaine par commande. Politique dsh `ask` pour toute escalade | La demande dsh ne montre pas les arguments de l'appel |
| A | Périmètre | Preset de permission **Read-only** ; seul le serveur MCP écrit, dans son dossier | Le serveur tourne hors bac à sable dsh : son confinement est le nôtre (chemins relatifs à `cwd` uniquement) |
| D | Catalogue étroit | Quatre outils dans le preset | — |
| C | Dépense | **Non natif, reporté.** Plafonds externes : HF 10 $ (fait le 16/09), DeepSeek à poser par Emmanuel sur sa console | Le compteur de dsh affiche, ne coupe pas |

## 5. Tests

Unitaires, `node --test`, sans dsh ni modèle :

1. `constat_creer` sans `preuve` → erreur de schéma nommant `preuve`.
2. `objet` contenant « M. Dupont Jean » ou « 06 12 34 56 78 » → rejeté.
3. `responsable: 'Emmanuel'` → rejeté (hors liste de rôles).
4. Deux créations → `constat-1`, `constat-2` ; relecture du journal → même état.
5. `valider.js constat-9` (inconnu) → refus, journal inchangé.
6. `valider.js constat-1` → statut `valide`, une ligne ajoutée au journal.

De bout en bout, dans dsh, modèle DeepSeek-V4-Flash, preset `atelier` :

- Tour 1 : « crée un constat sur l'étiquetage des stupéfiants », sans preuve.
  Attendu : refus du schéma visible dans la trajectoire, l'agent demande la preuve.
- Tour 2 : même demande avec une preuve fournie. Attendu : `constat-1` en
  `propose`, listé par `constat_lister`. Validation à la main ensuite.

Critère de réussite : les deux tours passent et la trajectoire montre que le
refus vient de l'outil, pas de la consigne.

## 6. Ce qui a été vérifié de bout en bout (16 septembre, 19 h)

Route utilisée : **HF** (V4 Flash témoin, Qwen3.8-27B, puis DeepSeek-V4-Pro-0813).
Aucune clé DeepSeek officielle : Emmanuel n'a pas de compte DeepSeek. ADR du soir :
HF reste la route.

| Point | Résultat |
|---|---|
| Client MCP chargé depuis un preset | **Oui.** `node serveur.js` est lancé par le processus dsh dès la composition de la session, avant tout tour. |
| Read-only tenu | **Oui.** La trajectoire montre l'injection « Current DSH file policy: read-only » et « Approval policy: ask ». |
| Refus du schéma visible dans la trajectoire | **Non testé tel quel** : aucun modèle n'a appelé l'outil sans preuve. Le refus est prouvé par le test protocole (`test/serveur.test.js`), pas en session. |
| L'agent a demandé la preuve | **Selon le modèle.** V4 Flash l'a **inventée** ; Qwen l'a **cherchée** dans le workspace puis a déclaré honnêtement qu'il n'en avait pas ; **V4-Pro-0813 l'a demandée**, sans appeler l'outil (2,7 s, 2,7 K tokens). Détail et notes dans `banc-modeles.md`. |
| Validation humaine | Essai V4 Flash : `constat-1` **non validé**, preuve inventée. Essai V4-Pro, tour 2 avec preuve fournie : `constat-1` créé en `propose` avec la preuve mot pour mot, puis **validé** par `node valider.js constat-1` → `valide`. Le circuit complet a tourné une fois. |
| Catalogue étroit | 5,9 K (V4 Flash) à 19,8 K (Qwen) tokens d'entrée par tour, contre 383 K le 02/09 en catalogue plein. |

Enseignement principal : le schéma impose la présence de la preuve, pas sa
véracité. Prochaine itération de l'outil : la preuve doit référencer un objet
que l'outil peut contrôler (fichier du workspace, entrée de registre).

## 7. Hors périmètre

Plafond de dépense natif, interface de validation autre que la ligne de
commande, tout métier réel, toute donnée d'officine, publication du dépôt.

## 8. Dettes créées

- Plafond DeepSeek à poser (Emmanuel, console DeepSeek).
- ADR route modèle du 16/09 en `propose`, à passer en `accepte` sur GO.
- Arbitrer l'envoi du 02/09 d'un corpus d'officine agrégé via HF (noté dans l'ADR).

## 9. Itération 2 (16 septembre, soir) — preuve vérifiable, RGPD à la frontière

Décidée après le résultat V4 Flash (preuve inventée) et le cadrage d'Emmanuel
(modèle auto-hébergé : modèle et données au même endroit, pas de contrainte
inutile). ADR `decisions/2026-09-16-rgpd-a-la-frontiere.md` (`propose`).

- **Connecteur `registre`** (`registre.js`, `registre-serveur.js`) : lecture seule
  des CSV de `~/dsh-lab/registres/` (séparateur `;`, un fichier = un registre).
  Outils `registre_chercher(texte, registre?)` et `registre_lire(id)`. Données
  réalistes, noms d'opérateurs fictifs, aucune pseudonymisation.
- **`constat_creer`** : `preuve` = liste de `registre:<id>` (regex), chaque id
  vérifié par `existeReference` injecté depuis le connecteur ; référence inconnue
  → refus « introuvable », rien n'est écrit. Filtre RGPD retiré de l'entrée,
  `responsable` libre. `detecterDonneePersonnelle` conservé pour `exporter`.
- **Preset `atelier`** : seconde entrée `dsh-mcp-client` (`serverName: registre`).
  Les deux serveurs sont lancés par dsh à la composition `[vérifié : deux
  processus enfants]`.
- **Tests** : 25 (`npm test`), dont 6 sur le connecteur et 5 sur le fil MCP.
- **Résultat S1 rejoué** : les trois modèles cherchent le registre et créent le
  constat avec la preuve réelle. Notes 96 / 96 / 88. Détail dans `banc-modeles.md`.
- **Faiblesse restante** : l'outil garantit l'existence de la preuve, pas sa
  pertinence (scénario S4 à jouer).

## 10. Itération 3 et outil `exporter` (16 septembre, 22 h 30)

Ordre choisi par autonomie (Emmanuel : « commence dans l'ordre où tu es le plus
autonome »).

- **Itération 3** : `chercher` insensible aux accents et à la casse (valeurs et
  nom de registre : « stupéfiants » trouve `stupefiants.csv`) ; `valider.js`
  affiche la ligne de registre citée **avant** de signer. L'humain valide avec
  la preuve sous les yeux.
- **`exporter`** (`exporter.js`, outil MCP `constat_exporter(id)`) : la
  frontière codée. N'exporte qu'un constat **validé** ; contrôle RGPD sur
  l'objet, le responsable et **chaque champ des lignes de registre citées** ;
  écrit un markdown autoportant dans `~/dsh-lab/exports/` ; ajoute un événement
  `exporte` au journal (état rejoué : `exporteLe`, `exportChemin`). L'envoi au
  tiers reste un geste humain.
- **Limite documentée par un test** : le filtre ne détecte pas un nom sans
  civilité (« Julien Morel » passe). C'est le filtre de l'itération 1, inchangé ;
  le durcir est un chantier à part (dictionnaire de prénoms, ou pseudonymisation
  des opérateurs à l'export).
- **Tests** : 35 (`npm test`) : 29 après l'itération 3, 35 avec l'export.
- Les nouveaux outils sont chargés à la prochaine session dsh (le serveur MCP
  est relancé à chaque composition) ; aucun redémarrage de dsh nécessaire.
