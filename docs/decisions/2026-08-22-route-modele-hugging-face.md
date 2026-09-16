# ADR — Route modèle : Hugging Face Inference Providers via `llm-pi-ai`

**22 août 2026.** Statut : **appliqué**, éprouvé de bout en bout avec appel d'outil.
Clôt le fil ouvert n°1 du handoff du 20 août (« trancher la route modèle, avant le
palier 2 »).

---

## 1. Contexte

Aucune clé de modèle n'était branchée depuis le déploiement du 20 août — décision
assumée. Le palier 2 du parcours de prise en main ne peut pas démarrer sans.

L'objectif posé par Emmanuel : **tester un modèle open source de Hugging Face**,
sans engagement financier, dans le bac à sable `dsh-lab`.

Deux voies existaient, et l'arbitrage était déjà écrit dans le handoff :

| Voie | Ce qu'elle implique |
|---|---|
| Adaptateur DeepSeek natif (`llm-deepseek`) | Route `deepseek-official`. Mais **chaque requête porte `x-deepseek-harness-user-id`**, identifiant anonyme stable non désactivable, envoyé même vers une passerelle configurée `[vérifié — README de dsh-llm-deepseek]`. Si le DPA compte, c'est disqualifiant |
| Adaptateur générique (`llm-pi-ai`) | Routes déclarées à la main vers n'importe quelle passerelle OpenAI-compatible. Aucun en-tête d'identité propriétaire |

Contraintes matérielles du poste, qui écartent l'inférence locale comme voie de
test : pas de GPU dédié (Intel iGPU 2 Go), 15,5 Go de RAM, aucun runtime local
installé. Plafond réaliste : un 4B–9B quantifié à quelques tokens/s — précisément
le régime où le tool-calling devient peu fiable, donc un mauvais banc d'essai.

---

## 2. Décision

Déclarer une route **`hf-router`** dans la section `llm-pi-ai:` de
`~/.dsh/settings.yaml`. Le catalogue pi-ai ne connaît pas cette passerelle : c'est
donc une route **déclarée à la main**, qui doit fournir protocole, endpoint et
liste de modèles.

```yaml
llm-pi-ai:
  providers:
    hf-router:
      displayName: Hugging Face Router
      api: openai-completions
      baseURL: https://router.huggingface.co/v1
      apiKeyEnv: HF_TOKEN
      compat:
        supportsDeveloperRole: false
        maxTokensField: max_tokens
      models:
        - id: Qwen/Qwen3.8-27B:featherless-ai   # ID ÉPINGLÉ — voir §3
          name: Qwen3.8-27B (HF)
          contextWindow: 262144
          maxTokens: 32768
        - id: deepseek-ai/DeepSeek-V4-Flash-0731
          name: DeepSeek-V4-Flash-0731 (HF, temoin)
          contextWindow: 262144
          maxTokens: 32768
```

**Les deux commutateurs `compat` ne sont pas décoratifs.** pi-ai déduit la forme de
la requête de l'identité du fournisseur et de l'URL ; pour un endpoint qu'il ne
reconnaît pas, il répond *comme si c'était OpenAI lui-même* — invite système en
rôle `developer`, plafond de sortie en `max_completion_tokens`. La plupart des
passerelles OpenAI-compatibles rejettent au moins l'un des deux.

**Le témoin est un choix de conception, pas un reliquat.** Un second modèle servi
par cinq fournisseurs distincts permet de distinguer « route cassée » de « modèle
indisponible ». Il a tranché le diagnostic du §3 en une requête. **Le garder.**

**Credential.** `apiKeyEnv` est une *référence*, jamais une valeur. Le token est
saisi par Emmanuel dans Settings → Models et stocké dans `~/.dsh/.credentials.yaml`
(0600). Le fichier de configuration ne porte aucun secret.

---

## 3. Le piège qui a coûté le plus de temps

`Qwen/Qwen3.8-27B` **nu** échoue en `400 model_not_supported` :

> *The requested model 'Qwen/Qwen3.8-27B' is not supported by any provider you have enabled.*

Le message oriente vers un fournisseur désactivé. **C'est une fausse piste** :
Featherless AI était bien actif sur le compte `[vérifié 22/08]`. Le router HF ne
résout simplement rien sur l'identifiant de dépôt nu ; il faut la forme épinglée
`<repo>:<provider>`, soit `Qwen/Qwen3.8-27B:featherless-ai`.

C'est le témoin DeepSeek qui a permis de le voir : il a répondu du premier coup,
établissant que endpoint, protocole, `compat`, token **et tool-calling** étaient
bons, et que seul l'identifiant était en cause.

---

## 4. Conséquences

**Vérifié de bout en bout `[22/08]`.** Sur `dsh-lab`, en mode Standard, permission
Workspace Write : les deux modèles ont appelé l'outil `Read` sur `hello.py` et
restitué son contenu **exact au caractère près** — 6 lignes, les deux vides bien en
position 3 et 4, comparé au fichier sur disque. Qwen a en plus produit des blocs de
raisonnement. Le tool-calling passe donc la passerelle OpenAI-compatible : c'était
le vrai point de rupture possible.

Perfs relevées : témoin DeepSeek — TTFT 0,7 s, 611 tok/s ; Qwen — TTFT 1,6 s,
86 tok/s. Cache hit 46–48 %.

**Coût réel : nul, mais plafonné.** Le compte `<compte-hf>` (non-PRO) dispose d'une
enveloppe d'inférence incluse de **0,10 $/mois**. Après 4 requêtes : `< 0,01 $ / 0,10 $`,
dépense de la période **0,00 $**, crédits 0,00 $ `[vérifié sur la page de facturation]`.
Rien n'est débité. La limite de dépense du compte est à 300 $ — très large pour un
bac à sable, à réduire si le compte sert un jour à autre chose.

**La contrainte qui va mordre.** 35,4 K tokens d'entrée **par tour** au troisième
échange, sur une tâche triviale : une boucle agentique renvoie tout l'historique à
chaque pas. L'enveloppe de 0,10 $ tient quelques dizaines de tours, pas une session
de travail. Le sujet n'est pas le prix unitaire, c'est le volume.

**Ce que cette route prouve pour la suite — le point stratégique.**
Le seam LLM est agnostique : cette route pointe vers une URL OpenAI-compatible.
Servir un modèle **en local** plus tard, c'est **la même route avec un autre
`baseURL`**. Le chemin cloud → on-premise n'est pas une réécriture. C'est le fait
le plus important de la journée pour le projet d'agents locaux.

**Périmètre de données — limite ferme.** Les prompts sortent du poste vers un
fournisseur tiers (Featherless AI, Baseten). `dsh-lab` ne contient que `hello.py`
et un README. **Aucune donnée d'officine, aucune donnée de santé, jamais par cette
route.** Le jour où il s'agira de données réelles, seule l'inférence locale est
dans les clous — et ce sera une décision de matériel, pas de configuration.

**Condition de réouverture.**
- Si le volume dépasse l'enveloppe : créditer HF en prépayé plutôt que souscrire
  PRO (9 $/mois n'apporte que ~2 $ de crédit d'inférence — mauvais calcul pour cet
  usage).
- Si la vitesse devient le critère : monter une seconde route (Groq, Cerebras,
  OpenRouter) — même forme de déclaration, les routes coexistent et se choisissent
  dans le sélecteur de modèle.
- Si un DPA est exigé : reprendre l'arbitrage du §1 en le documentant côté
  fournisseur, pas seulement côté harnais.
