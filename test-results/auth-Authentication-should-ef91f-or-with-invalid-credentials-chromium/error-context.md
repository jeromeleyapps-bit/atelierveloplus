# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Connexion" [level=1] [ref=e3]
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - text: Email
          - generic [ref=e9]: "*"
        - generic [ref=e10]:
          - textbox "Email" [ref=e11]: invalid@example.com
          - group:
            - generic: Email *
      - generic [ref=e12]:
        - generic [ref=e13]:
          - text: Mot de passe
          - generic [ref=e14]: "*"
        - generic [ref=e15]:
          - textbox "Mot de passe" [ref=e16]: wrongpassword
          - group:
            - generic: Mot de passe *
      - button "Se connecter" [ref=e17] [cursor=pointer]: Se connecter
      - link "Créer un compte" [ref=e18] [cursor=pointer]:
        - /url: /auth/register
        - text: Créer un compte
    - alert [ref=e19]:
      - img [ref=e21]
      - generic [ref=e23]: "API 401: {\"error\":\"invalid_credentials\"}"
      - button "Close" [ref=e25] [cursor=pointer]:
        - img [ref=e26]
  - generic [ref=e28]:
    - img [ref=e30]
    - button "Open Tanstack query devtools" [ref=e78] [cursor=pointer]:
      - img [ref=e79]
  - alert [ref=e127]
```