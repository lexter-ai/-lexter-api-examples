require("dotenv").config();

const axios = require("axios").default;
const fs = require("node:fs/promises");
const path = require("path");

// const LEXTER_API_DOMAIN = "https://integrations.lexter.ai/external/v1";
const LEXTER_API_DOMAIN = "http://localhost:3000/external/v1";

async function getLastProjects() {
  //Rota de listagem dos projetos:
  //https://documenter.getpostman.com/view/12667252/UVsHS7ax#110c682a-fc03-4b1f-b2e3-35240d24c01c
  const projectsListUrl = `${LEXTER_API_DOMAIN}/projects`;
  try {
    const response = await axios.get(projectsListUrl, {
      headers: {
        "x-company-id": process.env.COMPANY_ID,
        "x-api-key": process.env.API_KEY,
      },
    });

    //Vamos pegar o primeiro elemento da array, ou seja, a última análise criada.
    return response.data[0];
  } catch (e) {
    console.log("error", e);
  }
}

async function uploadDocuments() {
  //No nosso exemplo simplificado vamos listar todos os documentos dentro do
  //diretório `documents` na raiz deste projeto e subi-los para análise.
  //Outra simplificação que estamos fazendo aqui é que nós estamos supondo que
  //todos os documentos neste diretório são DOCX. Em um caso de uso real o MIME
  //type de cada documento deveria ser verificado programaticamente.
  const documentsDirPath = path.join(__dirname, "..", "documents");
  const folderFiles = await fs.readdir(documentsDirPath);

  //O upload dos documentos tem que ser feito para dentro da nuvem da Lexter.ai,
  //para isso é necessário pedir URLs com permissão adequada para o upload de
  //cada documento. O processo de assinatura permite que essas URLs fiquem válidas
  //para o público por apenas 30min, depois elas se tornam inválidas, deixando
  //todo o processo seguro e a prova de vazamentos.
  //Documentação:
  //https://documenter.getpostman.com/view/12667252/UVsHS7ax#0452cf7a-e589-4b8f-9bb1-701def04fcf0
  const uploadUrlsUrl = `${LEXTER_API_DOMAIN}/projects/uploadUrl?count=${folderFiles.length}`;
  const uploadUrlsResponse = await axios.get(uploadUrlsUrl, {
    headers: {
      "x-company-id": process.env.COMPANY_ID,
      "x-api-key": process.env.API_KEY,
    },
  });

  const uploadUrls = uploadUrlsResponse.data;

  //Vamos fazer o upload de todos os arquivos em paralelo.
  return Promise.all(
    folderFiles.map(async (file, index) => {
      const filePath = path.join(documentsDirPath, file);
      const uploadUrl = uploadUrls[index];

      const fileContent = await fs.readFile(filePath);

      await axios.put(uploadUrl, fileContent, {
        headers: {
          //Lembrando que estamos usando o Content-Type como o de DOCX por este
          //ser um exemplo simplificado, este valor deve ser alterado para cada
          //tipo de documento.
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        //É importante que nenhum header de autorização esteja presente no request
        //se ele existir você receberá um erro de acesso negado.
        transformRequest: [
          (data, headers) => {
            if (headers) {
              delete headers.Authorization;
            }
            return data;
          },
        ],
      });

      //Para a continuação do processo nós vamos precisar do par de dados
      //nome e URL que foi usada no upload, vamos retornar isso em um objeto para
      //simplificar o nosso código.
      return { name: file, url: uploadUrl };
    })
  );
}

async function createBundle(projectId, documents) {
  try {
    //Rota de criar um envio:
    //https://documenter.getpostman.com/view/12667252/UVsHS7ax#2cdc6cad-211b-4af9-a0a5-8133b64f2a74
    const postBundleUrl = `${LEXTER_API_DOMAIN}/projects/${projectId}`;
    const result = await axios.post(
      postBundleUrl,
      {
        name: "Bundle name",
        documents,
      },
      {
        headers: {
          "x-company-id": process.env.COMPANY_ID,
          "x-api-key": process.env.API_KEY,
        },
      }
    );

    //A rota retorna um objeto como ID do novo envio dentro dele, vamos
    //precisar desse identificador para interagir com o envio de agora em diante.
    return result.data.id;
  } catch (e) {
    console.log("Error creating bundle", e);
  }
}

async function getBundleDetails(projectId, bundleId) {
  //Documentação da rota:
  //https://documenter.getpostman.com/view/12667252/UVsHS7ax#4cec3975-6783-43af-b097-89774a4a28ab
  const bundleDetailsUrl = `${LEXTER_API_DOMAIN}/projects/${projectId}/bundles/${bundleId}`;
  try {
    const response = await axios.get(bundleDetailsUrl, {
      headers: {
        "x-company-id": process.env.COMPANY_ID,
        "x-api-key": process.env.API_KEY,
      },
    });

    return response.data;
  } catch (e) {
    console.log("error", e);
  }
}

async function getBundleResult(projectId, bundleId) {
  //Documentação da rota:
  //https://documenter.getpostman.com/view/12667252/UVsHS7ax#c9c19640-1807-4655-b88f-619c0d27390e
  const bundleResultsUrl = `${LEXTER_API_DOMAIN}/projects/${projectId}/bundles/${bundleId}/results`;
  try {
    const response = await axios.get(bundleResultsUrl, {
      headers: {
        "x-company-id": process.env.COMPANY_ID,
        "x-api-key": process.env.API_KEY,
      },
    });

    return response.data;
  } catch (e) {
    console.log("error", e);
  }
}

async function pullUntilComplete(projectId, bundleId) {
  //Nós faremos um pulling com intervalo de 1min, esse intervalo só é usado
  //para fins de exemplo, para aplicações reais um intervalo maior é recomendado,
  //uma vez que o processo de extração pode demorar do lado da Lexter.ai.
  //Para um programa rodando em produção um intervalo de 10min ou mais seria
  //recomendado.
  const oneMinute = 1 * 60 * 1000;
  return new Promise((resolve) => {
    const intervalId = setInterval(async () => {
      //A cada intervalo vamos pegar os detalhes do envio atual e verificar
      //o seu status para saber se podemos pedir os seus resultados ou não.
      const details = await getBundleDetails(projectId, bundleId);

      //Nesse exemplo simplificado estamos verificando apenas o caso de sucesso,
      //esperando que a extração seja concluída com sucesso.
      //Em um código de produção seria necessário checar os estados 'ARCHIVED' e
      //'CANCELED' também. Ambos esses status indicariam que o envio não vai
      //ser mais extraído e nós deveríamos parar o nosso loop. A diferença
      //dos status de falha é que nós não deveríamos pedir os resultados do
      //envio nesses casos.
      if (details.status === "FINISHED") {
        clearInterval(intervalId);
        //Vamos pegar os resultados do nosso envio e retorná-los para a nossa
        //função principal
        const results = await getBundleResult(projectId, bundleId);
        resolve(results);
      } else {
        console.log(`Bundle is not ready, in status: ${details.status}`);
      }
    }, oneMinute);
  });
}

async function pullingExemple() {
  //Vamos pegar a última análise criado para termos o ID da análise de extração
  //que vamos usar.
  //Lembre-se que essa análise tem que ser criado na plataforma da Lexter.ai.
  //A função getLastProjects é ilustrativa, uma vez que o uso comum seria que
  //o serviço soubesse o ID da análise que ele vai usar, e não procurar esse
  //ID no serviço da Lexter.ai.
  const project = await getLastProjects();
  const projectId = project.projectId;

  //Como primeiro paço vamos fazer o upload de todos os documentos que queremos
  //mandar para serem analisados pela Lexter.ai
  const documents = await uploadDocuments();

  //Com os documentos na nuvem da Lexter.ai podemos criar o nosso envio
  const currentBundleId = await createBundle(projectId, documents);
  console.log("New bundle id:", currentBundleId);

  //Depois de o nosso envio ter sido criado vamos começar a checar se ele foi
  //concluído, assim que ele estiver pronto vamos retornar os valores extraídos
  const results = await pullUntilComplete(projectId, currentBundleId);
  console.log("Results are ready:");
  console.log(results);
}

pullingExemple();
