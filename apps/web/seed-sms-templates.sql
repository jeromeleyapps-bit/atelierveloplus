-- Seed SMS templates manually

INSERT INTO "SMSTemplate" (id, name, event, content, active, "createdAt", "updatedAt")
VALUES 
  (
    'sms_bike_ready',
    'Vélo prêt',
    'bike_ready',
    '{{shop.name}} : Bonne nouvelle ! Votre {{bike.brand}} est prêt. Passez le récupérer quand vous voulez. {{shop.address}}. À bientôt !',
    true,
    NOW(),
    NOW()
  ),
  (
    'sms_order_arrived',
    'Commande arrivée',
    'order_arrived',
    '{{shop.name}} : Votre commande est arrivée ! Venez la récupérer à l''atelier ({{shop.address}}). Merci !',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (name) DO NOTHING;

-- Vérification
SELECT id, name, event, active FROM "SMSTemplate";
