-- Typ zmluvy rozhodcu a jej číslo. Typ nie je len evidenčný údaj — určuje, ako sa
-- počíta odmena a cestovné:
--   dobrovolnik — dobrovoľnícka zmluva, sadzby podľa výkazu dobrovoľníckej činnosti
--                 (náhrada straty času + stravné), strop daný sadzobníkom
--   szco        — rozhodca so živnosťou, fakturuje; cestovné paušálom
--   ramcova     — rámcová príkazná zmluva pre celoštátnych rozhodcov, ktorí nemôžu
--                 mať SZČO (prekážka na strane zamestnávateľa, alebo by im vznikla
--                 povinnosť platiť mikroodvod do Sociálnej poisťovne)
alter table referees add column if not exists contract_type text
  check (contract_type is null or contract_type in ('dobrovolnik', 'szco', 'ramcova'));

-- Číslo zmluvy prideľuje ekonomický úsek SZFB. V hromadnom príkaze do banky ide
-- ako variabilný symbol platby, takže bez neho sa rozhodcovi nedá poslať odmena.
alter table referees add column if not exists contract_number text;
