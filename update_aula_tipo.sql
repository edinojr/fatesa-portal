-- Este arquivo expande o enum aula_tipo existente no banco de dados para aceitar "atividade" e "prova"

ALTER TYPE aula_tipo ADD VALUE IF NOT EXISTS 'atividade';
ALTER TYPE aula_tipo ADD VALUE IF NOT EXISTS 'prova';
