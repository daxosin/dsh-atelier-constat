# Motifs pour un agent vertical — ce que l'écosystème dsh nous apprend

**22 août 2026.** Étude, pas décision. Sert d'entrée au cadrage du besoin officine.

> **Règle posée par Emmanuel, et qui gouverne ce document : on ne copie jamais un
> plugin. Que du sur-mesure adapté.** Ce qui suit relève donc les **motifs de
> conception** de quelques plugins remarquables. Aucun n'est à installer, aucun
> n'est à recopier. Un modèle de domaine emprunté importe les angles morts de son
> auteur — et la valeur d'un agent d'officine est précisément dans la
> modélisation métier, la seule chose qui ne s'emprunte pas.

---

## 0. L'observation qui compte avant toutes les autres

Sur les 25 plugins les plus étoilés créés depuis l'ouverture du dépôt, **plus de
la moitié est cosmétique ou outillage de développeur** : pets de bureau, fonds
d'écran animés, thème verre dépoli, recherche d'anime, widget de solde, clients
desktop, marchés de plugins.

**Personne ne fait de métier réglementé.** Dix mille dépôts en neuf jours, et le
terrain visé est vide. C'est le résultat le plus utile de cette revue : l'avantage
n'est pas d'arriver tôt sur dsh — c'est déjà perdu — mais d'arriver avec un métier
que personne dans cette liste ne connaît.

---

## 1. Le domaine comme graphe, les arêtes comme vocabulaire

*Observé sur `dsh-pentest` (CloverSecLabs).*

Le plugin ne stocke pas « des notes ». Il déclare six tables — objectifs,
intentions, faits, constats, actifs, arêtes — et **les arêtes portent le
vocabulaire du métier** : `spawns` (objectif→intention), `yields`
(intention→fait), `derived_from`, `proves` (intention→constat).

Ce que ça résout : le modèle ne rédige pas un compte rendu, il **instruit un
dossier**. La forme du raisonnement est contrainte par la forme des données.

**Transposition officine à instruire au cadrage** : quels sont les nœuds réels
d'un dossier qualité — constat, non-conformité, action corrective, preuve,
responsable, échéance ? Et surtout **quels verbes les relient** : « établit »,
« corrige », « justifie », « clôt ». Ces verbes sont le vrai livrable du cadrage ;
les tables en découlent.

---

## 2. La contrainte vit dans le schéma d'outil, pas dans la consigne

*Observé sur `dsh-pentest`.*

Un `finding` **exige** `reproducibleSteps`, au moins un. On ne peut pas déclarer
une vulnérabilité sans preuve reproductible : ce n'est pas une politesse dans un
prompt, c'est le schéma de l'outil qui refuse l'appel.

C'est le motif le plus important de toute cette revue pour un contexte réglementé.
Une consigne dans une invite est une suggestion qu'un modèle peut contourner sous
pression de contexte. **Un champ obligatoire dans un schéma d'outil ne se contourne
pas.**

**Transposition** : tout constat porte sa source vérifiable ; toute action porte
son responsable et sa date ; rien de nominatif n'entre dans un champ libre. Le
garde-fou RGPD cesse d'être une intention et devient une validation de schéma.

---

## 3. Identifiants déterministes et rejouabilité — l'auditabilité par construction

*Observé sur `dsh-pentest`.*

Les identifiants sont `<type>-<n>`, comptés par session. Le modèle les référence
d'un appel à l'autre, et **la projection de session rejoue exactement le même
graphe, purement depuis le journal**.

Conséquence : l'état n'est jamais à croire, il est à **reconstruire**. Pour une
inspection, c'est la différence entre « voici ce que le système affiche » et
« voici la dérivation complète, rejouable, de ce qu'il affiche ».

**Transposition** : c'est le socle d'un dossier opposable. À traiter comme une
exigence de conception, pas comme une optimisation tardive.

---

## 4. Le catalogue d'outils du premier appel conditionne toute la session

*Observé sur `dsh-anchored-standard` — 3 713★, le plus étoilé des vrais plugins.*

Trouvaille empirique de ce projet : **ce que le modèle voit comme outils à la
requête n°1 détermine le style de son raisonnement pour toute la session.**
Condition minimale → chaînes qui commencent par « We need… » ; condition complète
→ « Let me… ». Trois leviers isolés expérimentalement : le schéma d'outils, le
budget de sortie, les rappels injectés.

Le mécanisme retenu : démarrer sur deux outils, promouvoir vers le catalogue
complet une fois la session durable. Coût supplémentaire : nul. Une variante
radicale (`Eternal Minimal`) ne fait **jamais** grandir le catalogue visible et
route les outils lourds derrière une passerelle unique.

Ça recoupe notre propre mesure : la session Creator du 22/08, catalogue pléthorique,
est partie en exploration à **328 K tokens d'entrée en 7 étapes**.

**Transposition** : un agent d'officine doit démarrer étroit. C'est à la fois une
question de coût et de discipline de raisonnement — et c'est gratuit.

---

## 5. Le bundle auto-contenu est le canal de livraison client

*Observé sur `dsh-pentest`.*

Plugin hôte + interface web + backend sqlite distribués **dans un seul paquet**,
via les `exports` du `package.json`, installable depuis une URL de release.

**Transposition** : c'est la forme que prendra une livraison à une officine. À
garder en tête dès la conception — un agent conçu comme une configuration locale
ne se livre pas ; un agent conçu comme un bundle se livre, se versionne et se
retire.

Réserve : cette voie suppose de faire installer un paquet par le client. La
posture sécurité du jour (`2026-08-22-posture-securite-plugins.md`) vaut aussi
dans l'autre sens — ce qu'on refuse d'installer chez soi, on doit pouvoir le
justifier chez autrui.

---

## 6. Le canal d'accès est une décision de conception, pas une finition

*Observé sur `dsh-im` (531★) et `dsh-pocket` (447★).*

Le premier connecte le harnais à neuf messageries ; le second rend l'instance
accessible depuis un téléphone par QR code. Le motif n'est pas la liste, c'est la
question : **par où l'agent est-il atteint ?**

Un préparateur n'ouvrira pas une interface web — il est au comptoir. Poser la
question au cadrage, pas après la démonstration.

---

## Ce qu'on écarte, et pourquoi

- **Tout le pan cosmétique** — sans objet ici.
- **Les ponts vers des fournisseurs tiers** (`dsh-plugin-subscriptions`,
  `dsh-zai-coding-models`) — ils multiplient les sorties de données. Contraire à
  la trajectoire on-premise.
- **`dsh-context`** malgré sa pertinence réelle sur le coût : installation d'un
  paquet tiers, exclue par la posture du jour. Si l'instrument devient nécessaire,
  on écrira le peu qu'il nous faut.

---

## L'avertissement qu'il ne faut pas perdre

`dsh-anchored-standard`, 3 713 étoiles, a **cessé son développement actif**. Raison
donnée par son mainteneur : après les hausses de prix, **les boucles d'évaluation
dont ses presets dépendent ne sont plus finançables**.

Un projet de référence arrêté par le coût de sa propre évaluation. C'est le signal
le plus honnête de toute cette revue, et il vaut avertissement : **concevoir
sérieusement un preset coûte plus cher que l'utiliser**. Éprouver un agent
d'officine — le faire tourner des dizaines de fois sur des cas contrôlés pour
mesurer sa fiabilité — sera le vrai poste de dépense, très au-delà des 10 $ de
crédits du jour. À budgéter avant de s'engager, pas après.

---

## Ce que ce document attend du cadrage

Rien de ce qui précède ne peut être instancié avant que trois choses soient
écrites : **quels nœuds et quels verbes** composent le dossier métier (§1), **quels
champs sont obligatoires** parce qu'ils portent la preuve (§2), et **par où
l'agent est atteint** (§6). Le reste en découle mécaniquement.
