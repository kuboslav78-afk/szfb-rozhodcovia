-- Licenčná úroveň rozhodcu: N (nováčik/v príprave), C (1. kvalifikačný stupeň/regionálny), B (celoštátny)
alter table referees drop constraint if exists referees_license_level_check;
alter table referees add constraint referees_license_level_check
  check (license_level is null or license_level in ('N', 'C', 'B'));
