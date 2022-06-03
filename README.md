# Exemplos de uso da API da Lexter

## Rodando o projeto localmente

Para rodar o projeto de exemplos no seu local, basta ter Node.js e npm instalados.

Entre na pasta do projeto, rode `npm install` e em seguida `npm run pulling`,
pronto.

O projeto foi desenvolvido com Node.js 16, ele deve funcionar com versões mais
antigas que suportem `async/await`.

## Configurando o projeto

Esse projeto usa configurações via o arquivo `.env` localizado na pasta root.
Você pode alterar esse arquivo para alterar configurações como a chave da API
ou o ID do projeto de extração, por exemplo.

Segue a seguir o exemplo de um `.env`:

```bash
COMPANY_ID=XXXXXXXXXXXXXXXXXXXXXXXX
API_KEY=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

Alternativamente você pode definir esses valores diretamente no seu terminal
como variáveis de ambiente.

## Exemplo de pulling

Ao rodar o `npm run pulling` você estará iniciando o executável que vai criar um
novo bundle e depois vai ler o status desse bundle a cada 1min e logar os
resultados quando este bundle for concluído.

Veja o arquivo `./src/pulling.js` para explicações de como esse código funciona.
