-- Raison du dernier échec d'envoi à Zando Delivery, affichée sur la commande côté
-- restaurant (avec un bouton « Réessayer »). Remise à vide quand l'envoi réussit.
-- Écrite uniquement par la fonction zando-delivery-create (service_role).
alter table public.orders add column if not exists zando_delivery_erreur text;
