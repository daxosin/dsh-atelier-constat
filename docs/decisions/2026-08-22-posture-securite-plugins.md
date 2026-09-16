# ADR — Posture sécurité : aucun plugin tiers sur ce poste

**22 août 2026.** Statut : **règle en vigueur**, immédiate.
Portée : le poste d'Emmanuel. À réévaluer, pas à reconduire tacitement.

---

## 1. Contexte

L'écosystème dsh a produit **10 687 dépôts** portant le topic `dsh-plugin` en neuf
jours, dont **2 048 sur les trois derniers** `[vérifié 22/08 via l'API GitHub]`.
Aucun n'est audité. Un marché (`dsh-market`) et un annuaire de 3 100+ plugins
existent déjà, avec installation en une commande — la friction est nulle, et c'est
précisément le problème.

Deux signalements publics de la communauté, tous deux du 19–22 août :

**a) Credentials en clair — discussion #4039.**
`~/.dsh/.credentials.yaml` est écrit automatiquement par dsh, contient la clé
d'API en clair, et l'utilisateur n'est pas informé de l'écriture. La réponse
communautaire est résignée : *« tous les agents/harnais stockent en clair ; si
c'est une préoccupation, monter un relais d'API local »*. La documentation du
paquet `dsh-credentials-local` le reconnaît elle-même — permissions 0600 « stops
other OS users, **not the model** », et qualifie sa propre protection de
« discretion, not a boundary ».

**b) Traversée de chemin — discussion #3354.**
Le champ `dsh.bundle.patch` du `package.json` d'un bundle tiers n'est pas validé
avant d'être concaténé au chemin du paquet.

**Vérifié dans l'installation d'Emmanuel**, pas repris sur parole
`[vérifié 22/08]` — `@deepseek-ai/dsh-app-boot/lib/index.js`, lignes 548-550 :

```js
const declared = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8")).dsh?.bundle?.patch;
if (declared === void 0) throw new Error(...);   // seul contrôle : non-undefined
const patchPath = join(packageDir, declared);     // aucun contrôle de confinement
```

Un `../` dans `declared` s'échappe du dossier du paquet. Le correctif n'apparaît
pas dans les notes de 0.1.1-rc.1 ni rc.2 (lues intégralement) : **la version
installée, 0.1.0-rc.8, est concernée**.

**Ce que je n'ai PAS vérifié**, et qu'il ne faut donc pas affirmer : que
`.credentials.yaml` soit exfiltrable de bout en bout par cette voie. La primitive
établie est « lecture d'un chemin YAML/JSON arbitraire hors du paquet » ; que le
contenu atteigne la sortie dépend du chemin d'analyse, et je ne l'ai pas suivi
jusqu'au bout. `[hypothèse]` — mais une hypothèse dont le coût, si elle est
vraie, est la perte du token.

---

## 2. Décision

**Aucun plugin tiers n'est installé sur ce poste**, tant que les deux conditions
suivantes ne sont pas levées :

1. la traversée de chemin est corrigée dans la version installée, **vérification
   du code à l'appui** — pas sur la foi d'une note de version ;
2. et le credential ne vit plus en clair à portée des outils d'agent.

`dsh plugin add` est traité comme une **action à enjeu** au sens du contrat
global : elle exécute du code tiers non audité sur un poste portant un
credential. Elle requiert donc une validation explicite d'Emmanuel, jamais un
raccourci de ma part.

Cette décision se double d'une règle plus large qu'Emmanuel a posée le même jour :
**on ne copie jamais un plugin — on en étudie les motifs et on écrit du sur-mesure**
(mémoire `jamais-copier-un-plugin`, motifs relevés dans
`2026-08-22-motifs-agent-vertical.md`).

---

## 3. Conséquences

**Ce qu'on se refuse, et c'est un vrai coût.** `dsh-context` (820★) offre un
tableau de bord du contexte et une commande `/context` — exactement l'instrument
qui manquait le 22/08 pour comprendre une session partie à 328 K tokens. On s'en
prive volontairement. Ce n'est pas gratuit, et il ne faut pas le présenter comme
tel.

**Contournements légitimes**, par ordre de préférence :
- écrire le peu dont on a besoin en sur-mesure, dans un preset local ;
- si un plugin tiers doit absolument être évalué : sur une **instance jetable**,
  avec un `$DSH_HOME` distinct et **aucun credential**, jamais sur ce poste ;
- lire le `package.json` et le code du paquet avant toute installation — le
  champ `dsh.bundle.patch` en premier.

**Ce que ça ne couvre pas.** Cette règle ne dit rien des serveurs MCP déjà
connectés à la session Claude Code, ni des skills installées. Périmètre distinct,
à traiter séparément si besoin — la skill `revue-exposition` couvre l'exposition
externe, pas la chaîne d'approvisionnement locale.

**Condition de réouverture.** Une version de dsh dont le code — et non les notes —
montre un contrôle de confinement sur `dsh.bundle.patch`. Refaire alors la
vérification des lignes citées au §1 : c'est trois minutes, et c'est ce qui
distingue une posture d'une superstition.

**À reconsidérer aussi** si le stockage des credentials change : la documentation
de `dsh-credentials-local` annonce un fournisseur adossé au trousseau de l'OS
comme « réponse différée ». Son arrivée lèverait la seconde condition.
