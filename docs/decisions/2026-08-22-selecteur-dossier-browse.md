# ADR — Remplacer le sélecteur de dossier natif par le sélecteur in-app

**22 août 2026.** Statut : **appliqué**, vérifié en fonctionnement.
Portée : profil `web` du poste d'Emmanuel. Aucune incidence sur les autres profils
(aucun autre n'est installé).

---

## 1. Contexte

Le bouton **« Add workspace »** de l'interface web ne produisait rien : ni boîte de
dialogue, ni message d'erreur, ni entrée dans la console du navigateur, ni ligne
dans le log du serveur. `~/.dsh/storages/workspace.json` restait à
`"workspaceIds": []`. Sans workspace enregistré, le composeur est désactivé et le
texte saisi n'est même pas retenu : **dsh est inutilisable**.

Échec constaté des deux côtés `[vérifié 22/08]` : en automatisation navigateur
(clics par coordonnées et par référence d'élément, barre latérale repliée puis
dépliée) **et** à la main par Emmanuel. Ce n'était donc pas un artefact
d'automatisation.

**Cause.** Le profil compose `@deepseek-ai/dsh-host-directory-picker-auto`. Ce
« chooser adaptatif » échantillonne la situation de l'hôte **une seule fois au
boot** et monte le backend correspondant. Ses critères pour choisir `native`
(documentés dans son README) : plateforme win32 ou darwin, bind sur la boucle
locale, et absence de `SSH_CONNECTION`/`SSH_TTY`. Les trois sont réunis ici, donc
il résout `native` — un pilote **sans interface** qui demande au processus **Node**
d'ouvrir la boîte de dialogue Windows. Cette boîte ne s'ouvre jamais sur ce poste.

Le paquet lui-même annonce la limite, dans ses « Known Limitations » :

> *Native folder selection depends on the local Host carrier* — sous la composition
> `-native`, les déploiements en processus ou en navigateur distant ne peuvent pas
> ouvrir de dialogue système local. La sélection utilisable à distance est le flux
> in-app de la composition `-browse`.

Et le README de `-auto` désigne lui-même le point de bascule : *« compose the
`-native` or `-browse` row directly instead of this one »*.

**Mise à jour écartée.** Les notes de release de `0.1.1-rc.1` et `0.1.1-rc.2`
(lues intégralement, `[vérifié]`) ne contiennent rien sur les workspaces ni sur le
sélecteur de dossier — uniquement un modèle vision, un correctif de mise en page
sur les références `@`, un correctif de bac à sable Bubblewrap (Linux), et de
l'upload d'images. Monter en version aurait coûté ~50 min (contrainte
`--node-linker=hoisted`) pour ne rien corriger ici. Le poste reste en `0.1.0-rc.8`.

---

## 2. Décision

Basculer le profil `web` sur le backend **in-app** (`-browse`), dans la couche de
patch utilisateur `~/.dsh/profiles/web/cordis.patch.yml` :

```yaml
- id: directory-picker
  name: '@deepseek-ai/dsh-host-directory-picker-auto'
  disabled: true
- insert:
    - id: directory-picker-browse
      name: '@deepseek-ai/dsh-host-directory-picker-browse'
    - id: directory-picker-browse-ui
      name: '@deepseek-ai/dsh-client-ui-directory-picker-browse'
```

Trois points non négociables, chacun payé d'une erreur en séance :

| Point | Pourquoi | Symptôme si oublié |
|---|---|---|
| **Désactiver `-auto`** | Monter le chooser **et** un backend échoue bruyamment (service `directoryPicker` en double, flux client en double dans des trous `single`) | Échec de chargement du plugin |
| **Insérer les DEUX faces** | Le sélecteur est monté comme **deux entrées Loader distinctes** — backend hôte et surface client (cf. `SURFACE_PACKAGES` dans `-auto`). Le paquet hôte n'a **pas** d'export `./client` | Le trou de flux reste vide et le bouton **disparaît** au lieu d'être réparé — comportement documenté : *« an empty hole means the composition has no picking affordance … the sidebar header drops its add button rather than offering a dead one »* |
| **Redémarrer le serveur** | Le patch est relu à chaud, mais la moitié **navigateur** vient de la table de modules client construite au démarrage | Le patch est actif côté hôte, l'interface ne change pas |

---

## 3. Conséquences

**Acquis.**
- « Add workspace » ouvre une boîte **Select Workspace Directory** dans la page :
  vue à deux colonnes, fil d'Ariane avec zone de saisie de chemin cliquable,
  création de dossier, bascule fichiers cachés.
- `C:\Users\<vous>\dsh-lab` enregistré `[vérifié 22/08]`.
- Bénéfice non recherché : `-browse` fonctionne aussi pour un navigateur **distant**.
  Si dsh est un jour servi ailleurs que sur la boucle locale, ce choix est déjà le bon.

**Coûts et limites.**
- La couche de patch est **utilisateur** : elle ne survit pas à un `initProfile`.
  À refaire après toute réinitialisation de profil. Consigné en mémoire d'agent
  (`dsh-selecteur-dossier-natif-mort`).
- `-browse` n'a **aucune restriction de racine** : le dialogue expose tout le
  système de fichiers. Sans conséquence ici (`workspace.create` accepte de toute
  façon un chemin arbitraire), mais à savoir si dsh est un jour exposé à un tiers.
- Sur Windows, l'attribut caché n'est pas lu : `hidden` = préfixé d'un point.
- L'ascendance s'arrête à la racine du lecteur — changer de lecteur passe par la
  saisie de chemin, pas par la navigation.

**Vérification.** `dsh --profile web --dump-config` compose exactement ce que boote
le serveur : c'est l'outil de contrôle, pas la lecture du fichier de patch.

**Condition de réouverture.** Une version de dsh dont les notes mentionnent
explicitement le sélecteur de dossier ou le portage Windows du backend natif.
Retirer alors le patch et vérifier que `-auto` produit une boîte de dialogue.

**Signal à ne pas perdre.** Le chemin Windows est visiblement de seconde zone dans
dsh : un bouton mort, silencieux, sur la seule action sans laquelle le produit ne
démarre pas. À garder en tête si la cible d'un futur agent est un poste d'officine
sous Windows.
