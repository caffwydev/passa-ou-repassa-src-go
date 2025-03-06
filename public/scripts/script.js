const socket = io("http://" + window.location.hostname + ":3000");
const click = new Audio("/audio/click.mp3");
const correct = new Audio("/audio/correct.mp3");
const incorrect = new Audio("/audio/incorrect.mp3");
const board = new Audio("/audio/board.mp3");
const win = new Audio("/audio/win.mp3");
const suspense = new Audio("/audio/suspense.mp3");
function hideOrShowScores(ex) {
  if (ex) {
    try {
      document.getElementById("red-score").classList.add("hidden");
    } catch (e) {}
    try {
      document.getElementById("blue-score").classList.add("hidden");
    } catch (e) {}
  } else {
    try {
      document.getElementById("red-score").classList.remove("hidden");
    } catch (e) {}
    try {
      document.getElementById("blue-score").classList.remove("hidden");
    } catch (e) {}
  }
}
const Contadores = {
  atual: document.querySelector("#counter1"),
  total: document.querySelector("#counter2"),
};

let Scoreboard = {
  Red: 0,
  Blue: 0,
  Selected: -1,
};
let Questions = {};
let CurrentQuestionNumber = 0;
let CurrentQuestion = [];
let Answer = "";
let gameSettings = {};
let CanAnswer = false;
let CanRepassar = true;

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});
var duration = 5 * 1000;
let end;

function shotconfetti() {
  if (!end) end = Date.now() + duration;

  confetti({
    particleCount: 10,
    angle: 60,
    spread: 120,
    origin: { x: 0 },
  });

  confetti({
    particleCount: 10,
    angle: 90,
    spread: 120,
    origin: { x: 0.5 },
  });

  confetti({
    particleCount: 10,
    angle: 120,
    spread: 120,
    origin: { x: 1 },
  });
  if (Date.now() < end) {
    requestAnimationFrame(shotconfetti);
  }
}
function scrambleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let alternatives = {
  main: document.querySelector("#alternatives"),
  a: document.querySelector("#alternative-1"),
  b: document.querySelector("#alternative-2"),
  c: document.querySelector("#alternative-3"),
  d: document.querySelector("#alternative-4"),
};

function setAlternatives(arrayofAlternatives) {
  alternatives.a.textContent = arrayofAlternatives[0];
  alternatives.b.textContent = arrayofAlternatives[1];
  alternatives.c.textContent = arrayofAlternatives[2];
  alternatives.d.textContent = arrayofAlternatives[3];
  CurrentQuestion = arrayofAlternatives;
}

function HighLight(alternativeName) {
  if (alternatives[alternativeName]) {
    let parentDiv = document.querySelector(
      `div.alt-${{ a: 1, b: 2, c: 3, d: 4 }[alternativeName]}`
    );
    parentDiv.classList.add("bg-purple-900");
  } else {
    document.querySelector(`div.alt-1`).classList.remove("bg-purple-900");
    document.querySelector(`div.alt-2`).classList.remove("bg-purple-900");
    document.querySelector(`div.alt-3`).classList.remove("bg-purple-900");
    document.querySelector(`div.alt-4`).classList.remove("bg-purple-900");
  }
}

function drop(d) {
  alternatives.main.classList.remove(d ? "flex" : "hidden");
  alternatives.main.classList.add(d ? "hidden" : "flex");
}

function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = "expires=" + d.toUTCString();
  document.cookie =
    name +
    "=" +
    encodeURIComponent(JSON.stringify(value)) +
    ";" +
    expires +
    ";path=/";
}
function getCookie(name) {
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(";");
  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();
    if (cookie.indexOf(name + "=") === 0) {
      return JSON.parse(cookie.substring(name.length + 1));
    }
  }
  return null;
}

let settings = {
  backgroundMusic: true,
  soundEffect: true,
  inverter: false,
  modoMisterio: false,
  semPlacar: false,
};

function saveSettings() {
  setCookie("appSettings", settings, 365);
}

function loadSettings() {
  const savedSettings = getCookie("appSettings");
  if (savedSettings) {
    settings = savedSettings;
  }
}

loadSettings();
const bgm = new Audio("/audio/bgm.mp3");
bgm.addEventListener("canplaythrough", () => {
  bgm.volume = settings.backgroundMusic ? 0.05 : 0;
  click.volume = settings.soundEffect ? 0.5 : 0;
  correct.volume = settings.soundEffect ? 0.5 : 0;
  incorrect.volume = settings.soundEffect ? 0.5 : 0;
  board.volume = settings.soundEffect ? 0.5 : 0;
  bgm.loop = true;
  bgm.play();
});

const questionTextElement = document.getElementById("question-text");
const questionSubTextElement = document.getElementById("question-subtext");
const redElement = document.querySelector(".red");
const blueElement = document.querySelector(".blue");
const appStatusElement = document.querySelector("#app-status");

let WaitingSignal = false;

function startTyping(d) {
  questionTextElement.textContent = "";
  if (d === "") return;
  if (d.length > 110) questionTextElement.style.fontSize = "24px";
  if (d.length < 111) questionTextElement.style.fontSize = "32px";
  for (let i = 0; i < d.length; i++) {
    setTimeout(
      () => (questionTextElement.textContent += d[i]),
      (i * 1000) / d.length
    );
  }

  return new Promise((r) => setTimeout(r, 1000));
}

function setSubtext(subtext) {
  if (subtext) {
    questionSubTextElement.innerHTML = subtext;
    questionSubTextElement.style.fontSize = "16px";
    questionSubTextElement.style.display = "block";
    questionSubTextElement.classList.add("typing");
  } else {
    questionSubTextElement.style.display = "hidden";
    questionSubTextElement.classList.remove("typing");
  }
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}
let winModal;

function askQuestion(ignoreSignal) {
  if (CurrentQuestionNumber >= Questions.length) return winModal();
  Contadores.atual.innerText = CurrentQuestionNumber + 1;
  Contadores.total.innerText = Questions.length;
  startTyping(Questions[CurrentQuestionNumber].text);
  setTimeout(() => {
    setAlternatives(scrambleArray(Questions[CurrentQuestionNumber].options));
    drop();
    Answer = Questions[CurrentQuestionNumber].answer;
    WaitingSignal = ignoreSignal ? false : true;
  }, 1500);
}

function startQuiz(name) {
  startTyping(name);

  setTimeout(() => {
    setSubtext("Iniciando...");
    setTimeout(() => {
      setTimeout(() => {
        setSubtext();
        askQuestion();
      }, 500);
    }, 100);
  }, 1000);
}

function reset(callback) {
  if (
    redElement.classList.contains("expanded") ||
    blueElement.classList.contains("expanded")
  ) {
    redElement.classList.remove("expanded");
    blueElement.classList.remove("expanded");
    return setTimeout(callback, 1000);
  } else {
    return callback();
  }
}

function blueSelect() {
  reset(() => {
    Scoreboard.Selected = 1;
    CanAnswer = true;
    blueElement.classList.add("expanded");
    redElement.classList.remove("expanded");
    ripple(document.querySelector(".blue"), true);
    click.play();
  });
}

function redSelect() {
  reset(() => {
    Scoreboard.Selected = 2;
    CanAnswer = true;
    blueElement.classList.remove("expanded");
    redElement.classList.add("expanded");
    ripple(document.querySelector(".red"));
    click.play();
  });
}

function ShowScore() {
  reset(() => {
    blueElement.classList.add("expanded");
    redElement.classList.add("expanded");
    board.play();
  });
}

function restore() {
  return new Promise((r) => reset(r));
}
let justStarted = true;
socket.on("connect", () => {
  appStatusElement.textContent = "Pareando";
  if (justStarted) {
    startTyping(`Passa ou Repassa`);
    justStarted = false;
  }
  appStatusElement.classList.remove("text-red-600");
  appStatusElement.classList.add("text-yellow-500");
});

socket.on("status", (info) => {
  const i = {
    paired: info === "true",
  };

  if (i.paired) {
    if (appStatusElement.textContent === "Pronto") return;
    appStatusElement.textContent = "Pronto";
    Toast.fire({
      icon: "success",
      title: "Pareado com o Arduino!",
    });

    appStatusElement.classList.remove("text-red-600");
    appStatusElement.classList.remove("text-yellow-500");
    appStatusElement.classList.add("text-green-500");
  } else {
    if (appStatusElement.textContent === "Pronto")
      Toast.fire({
        icon: "warning",
        title: "Arduino desconectado!",
      });
    else if (appStatusElement.textContent === "Desconectado")
      Toast.fire({
        icon: "warning",
        title: "Arduino não encontrado!",
      });

    appStatusElement.textContent = "Pareando";
    appStatusElement.classList.remove("text-red-600");
    appStatusElement.classList.remove("text-green-500");
    appStatusElement.classList.add("text-yellow-500");
  }
});

function openSettingsModal() {
  Swal.fire({
    title: "Configurações",
    showClass: {
      backdrop: "swal2-noanimation",
      popup: "",
      icon: "",
    },
    hideClass: {
      popup: "",
    },
    html: `
          <div class="settings-container">
              <div class="setting">
                  <span class="setting-label">Inverter Botões</span>
                  <label class="switch">
                      <input type="checkbox" id="inverter" ${
                        settings.inverter ? "checked" : ""
                      }>
                      <span class="slider"></span>
                  </label>
              </div>
              <div class="setting">
                  <span class="setting-label">Efeito Sonoro</span>
                  <label class="switch">
                      <input type="checkbox" id="sound-effect" ${
                        settings.soundEffect ? "checked" : ""
                      }>
                      <span class="slider"></span>
                  </label>
              </div>
              <div class="setting">
                  <span class="setting-label">Música de fundo</span>
                  <label class="switch">
                      <input type="checkbox" id="bgm" ${
                        settings.backgroundMusic ? "checked" : ""
                      }>
                      <span class="slider"></span>
                  </label>
              </div>
              <div class="setting">
                  <span class="setting-label">Modo mistério</span>
                  <label class="switch">
                      <input type="checkbox" id="modomist" ${
                        settings.modoMisterio ? "checked" : ""
                      }>
                      <span class="slider"></span>
                  </label>
              </div>
              <div class="setting">
                  <span class="setting-label">Desligar placar</span>
                  <label class="switch">
                      <input type="checkbox" id="semplac" ${
                        settings.semPlacar ? "checked" : ""
                      }>
                      <span class="slider"></span>
                  </label>
              </div>
          </div>
      `,
    showCloseButton: true,
    focusConfirm: false,
    confirmButtonText: "Salvar",
    preConfirm: () => {
      const backgroundMusic = document.getElementById("bgm").checked;
      const soundEffect = document.getElementById("sound-effect").checked;
      const inverter = document.getElementById("inverter").checked;
      const semPlacar = document.getElementById("semplac").checked;

      const modoMisterio =
        semPlacar || document.getElementById("modomist").checked;

      return {
        backgroundMusic,
        soundEffect,
        inverter,
        modoMisterio,
        semPlacar,
      };
    },
  }).then((result) => {
    if (result.isConfirmed) {
      settings = result.value;
      bgm.volume = settings.backgroundMusic ? 0.2 : 0;

      click.volume = settings.soundEffect ? 0.7 : 0;
      correct.volume = settings.soundEffect ? 0.7 : 0;
      incorrect.volume = settings.soundEffect ? 0.7 : 0;
      board.volume = settings.soundEffect ? 0.7 : 0;

      saveSettings();
    }
  });
}
function openHelp() {
  Swal.fire({
    title: "Ajuda",
    showClass: {
      backdrop: "swal2-noanimation",
      popup: "swal2-noanimation",
      icon: "swal2-noanimation",
    },
    hideClass: {
      popup: "",
    },
    html: `
          <div class="settings-container">
              <div class="setting">
                  <span class="setting-label">Pressione 1, 2, 3 ou 4 para marcar alternativa</span>
              </div>
              <div class="setting">
                  <span class="setting-label">Pressione C para abrir as configurações</span>
              </div>
              <div class="setting">
                  <span class="setting-label">Pressione S para iniciar o jogo</span>
              </div>
              <div class="setting">
                  <span class="setting-label">Pressione R para resetar o jogo</span>
              </div>
              <div class="setting">
                  <span class="setting-label">Pressione A para avançar para a próxima questão</span>
              </div>
              <div class="setting">
                  <span class="setting-label">Pressione U para fazer o upload de um set de questões</span>
              </div>
              <div class="setting">
                  <span class="setting-label">Pressione B para entrar no modo construção (NOVO)</span>
              </div>
          </div>
      `,
    showCloseButton: true,
    focusConfirm: false,
    showConfirmButton: false,
  });
}

function bindKey(key, action) {
  document.addEventListener("keydown", function (event) {
    if (event.key.toLowerCase() === key.toLowerCase()) {
      action();
    }
  });
}
bindKey("H", openHelp);
bindKey("B", () => {
  window.location.href = "/builder.html";
});
bindKey("C", openSettingsModal);
function getElementCenterCoordinates(element) {
  const rect = element.getBoundingClientRect();

  const x = rect.right + rect.width / 2;
  const y = rect.top + rect.height / 2;

  return { x, y };
}

function ripple(element, eee) {
  return new Promise((Resolve) => {
    setTimeout(() => {
      let ripple = document.createElement("span");
      ripple.classList.add("ripple");
      element.appendChild(ripple);

      let coords = getElementCenterCoordinates(element);
      let x = (eee ? 0 : coords.x) - element.offsetLeft;
      let y = coords.y - element.offsetTop;

      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      setTimeout(() => {
        ripple.remove();
        Resolve();
      }, 2000);
    }, 100);
  });
}
socket.on("button", (r) => {
  console.log(r);
  if (WaitingSignal && r !== "PO" && r !== "O") {
    WaitingSignal = false;
    if (r == (settings.inverter ? "2" : "1")) {
      blueSelect();
    } else if (r == (settings.inverter ? "1" : "2")) {
      redSelect();
    }
  }
  if (r == "3") {
    if (canProceed) {
      canProceed = false;
      restore();
      setSubtext();
      CurrentQuestionNumber++;
      CanRepassar = true;
      askQuestion();
    }
  }
});

function setupGame(questionary, questionaries) {
  Swal.fire({
    title: "Configurar jogo",
    showClass: {
      backdrop: "swal2-noanimation",
      popup: "",
      icon: "",
    },
    hideClass: {
      popup: "",
    },
    html: `
      <div class="settings-container">
        <div class="setting">
          <span class="setting-label">Repassar</span>
          <label class="switch">
            <input type="checkbox" id="repassar" checked/>
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting">
          <span class="setting-label">Auto Avançar</span>
          <label class="switch">
            <input type="checkbox" id="autoplay" checked/>
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting">
          <span class="setting-label">Cor [Time 1]</span>
          <label class="selecter">
            <div class="settings-container">
              <select
                id="color1"
                class="block w-full text-sm text-black border border-gray-200 rounded-sm bg-white-600 focus:ring-blue-300 focus:border-blue-300"
              >
                <option value="#007bff" selected>
                  Azul
                </option>
                <option value="ff0000">
                  Vermelho
                </option>
                <option value="940094">
                  Roxo
                </option>
                <option value="50C878">
                  Verde
                </option>
                <option value="f7d200">
                  Amarelo
                </option>
                <option value="ff7e93">
                  Rosa
                </option>
              </select>
            </div>
          </label>
        </div>
        <div class="setting">
          <span class="setting-label">Cor [Time 2]</span>
          <label class="selecter">
            <select
              id="color2"
              class="block w-full text-sm text-black border border-gray-200 rounded-sm bg-white-600 focus:ring-blue-300 focus:border-blue-300"
            >
              <option value="#007bff">
                Azul
              </option>
              <option value="ff0000" selected>
                Vermelho
              </option>
              <option value="940094">
                Roxo
              </option>
              <option value="50C878">
                Verde
              </option>
              <option value="f7d200">
                Amarelo
              </option>
              <option value="ff7e93">
                Rosa
              </option>
            </select>
          </label>
        </div>
        <div class="setting">
          <span class="setting-label">Nome [Time 1]</span>
          <label class="selecter">
            <input type="text" value="Time Azul" id="name1" class="block w-full text-gray-900 border border-gray-300 rounded-sm bg-gray-50 text-xs focus:ring-blue-500 focus:border-blue-500 outline-none">
          </label>
        </div>
        <div class="setting">
          <span class="setting-label">Nome [Time 2]</span>
          <label class="selecter">
            <input type="text" value="Time Vermelho" id="name2" class="block w-full text-gray-900 border border-gray-300 rounded-sm bg-gray-50 text-xs focus:ring-blue-500 focus:border-blue-500 outline-none">
          </label>
        </div>
      </div>
    `,
    footer: questionary.name,
    showCloseButton: true,
    focusConfirm: false,
    confirmButtonText: "Iniciar Jogo",
    preConfirm: () => {
      const repassar = document.getElementById("repassar").checked;
      const autoplay = document.getElementById("autoplay").checked;
      const color1 = document.getElementById("color1").value;
      const color2 = document.getElementById("color2").value;
      const name1 = document.getElementById("name1").value;
      const name2 = document.getElementById("name2").value;
      hideOrShowScores(settings.modoMisterio);
      if (appStatusElement.textContent !== "Pronto")
        Swal.showValidationMessage(
          "Cadê o arduino calabreso? você acha que me engana?"
        );
      return {
        repassar,
        autoplay,
        color1,
        color2,
        name1,
        name2,
        gameInProgress: true,
      };
    },
  }).then((result) => {
    if (result.isConfirmed) {
      const configs = result.value;
      blueElement.style.backgroundColor = "#" + configs.color1;
      redElement.style.backgroundColor = "#" + configs.color2;
      document.querySelector("#team1_marker").textContent = configs.name1;
      document.querySelector("#team2_marker").textContent = configs.name2;

      gameSettings = configs;
      Questions = scrambleArray(questionaries[questionary.name].questions);

      startQuiz(questionary.name);
    }
  });
}
function updateFileName() {
  const fileInput = document.getElementById("fileInput");
  const fileNameDisplay = document.getElementById("fileName");
  const file = fileInput.files[0];

  if (file) {
    fileNameDisplay.textContent = `Arquivo selecionado: ${file.name}`;
  } else {
    fileNameDisplay.textContent = "";
  }
}
function openUploaderModal() {
  Swal.fire({
    title: "Uploader de Arquivos",
    showClass: {
      backdrop: "swal2-noanimation",
      popup: "",
      icon: "",
    },
    hideClass: {
      popup: "",
    },
    html: `
<div class="uploader-container">
  <input type="file" id="fileInput" class="hidden" onchange="updateFileName()">
  <div id="fileName" class="text-center mb-2"></div>
  <button id="fileButton" class="border border-gray-300 rounded p-2 w-full mb-4 bg-blue-500 text-white">
    Selecionar Arquivo
  </button>
  <div id="uploadStatus" class="text-center"></div>
</div>
      `,
    showCloseButton: true,
    focusConfirm: false,
    confirmButtonText: "Enviar",
    willOpen: () => {
      document
        .getElementById("fileButton")
        .addEventListener("click", function () {
          document.getElementById("fileInput").click();
        });
    },
    preConfirm: () => {
      const fileInput = document.getElementById("fileInput");
      const file = fileInput.files[0];

      if (!file) {
        Swal.showValidationMessage("Por favor, selecione um arquivo!");
        return false;
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
          const data = e.target.result;
          socket.emit("uploadFile", data);
          socket.once("resultUpl", (status) => {
            status = JSON.parse(status);
            if (status.success)
              Swal.fire("Sucesso!", "Arquivo enviado!", "success");
            else Swal.fire("Erro!", "Falha ao enviar arquivo", "error");
          });
          resolve();
        };
        reader.readAsArrayBuffer(file);
      });
    },
  }).then((result) => {
    if (result.isConfirmed) {
    }
  });
}

function openStartModal(qs, questionaries) {
  let Options = ``;
  Object.keys(qs).forEach((q) => {
    Options += `<option value="${q}" ${q === 1 ? "selected" : ""}>${
      qs[q]
    }</option>`;
  });

  Swal.fire({
    title: "Selecionar Questionário",
    showClass: {
      backdrop: "swal2-noanimation",
      popup: "",
      icon: "",
    },
    hideClass: {
      popup: "",
    },
    html: `
    <select id="questionnaireSelect" class="block w-full p-2 text-sm text-black border border-gray-200 rounded-sm bg-white-600 focus:ring-blue-300 focus:border-blue-300">${Options}</select>
      `,
    showCloseButton: true,
    focusConfirm: false,
    confirmButtonText: "Confirmar",
    preConfirm: () => {
      const questionnaireSelect = document.getElementById(
        "questionnaireSelect"
      );
      if (appStatusElement.textContent !== "Pronto")
        Swal.showValidationMessage(
          "Cadê o arduino calabreso? você acha que me engana?"
        );
      if (qs[questionnaireSelect.value]) {
        return {
          name: qs[questionnaireSelect.value],
          id: questionnaireSelect.value,
        };
      } else return Swal.showValidationMessage("Selecione algum questionário!");
    },
  }).then((result) => {
    if (result.isConfirmed) {
      setupGame(result.value, questionaries);
    }
  });
}

function InitializeGame() {
  if (appStatusElement.textContent !== "Pronto")
    return Toast.fire({
      icon: "error",
      text: "Arduino não encontrado! Conecte o arduino antes de iniciar o jogo!",
    });
  console.log("LEPOOO");
  socket.emit("list-questionaries");
  socket.once("questionary", (questionaries) => {
    console.log(questionaries);
    let qn = {};
    Object.keys(questionaries).forEach((q) => {
      qn[questionaries[q].id] = q;
    });
    openStartModal(qn, questionaries);
  });
}
bindKey("U", openUploaderModal);
bindKey("S", InitializeGame);
bindKey("R", () => {
  window.location.reload();
});
let ConfirmAnswer = -1;
let canProceed = false;
function AnswerQuestion(number) {
  if (!CanAnswer) return;
  if (ConfirmAnswer !== number) {
    ConfirmAnswer = number;
    HighLight(false);
    HighLight(["a", "b", "c", "d"][number - 1]);
    return setSubtext("Pressione novamente para confirmar...");
  }
  HighLight(false);
  CanAnswer = false;
  ConfirmAnswer = -1;
  drop(true);
  if (CurrentQuestion[number - 1] == Answer) {
    correct.play();
    document.querySelector(".success-checkmark").classList.remove("hidden");
    setSubtext(CurrentQuestion[number - 1]);
    addOne(Scoreboard.Selected === 2);

    startTyping("Resposta Correta!").then(() => {
      CurrentQuestionNumber++;
      CanRepassar = true;
      if (settings.modoMisterio) {
        document.querySelector(".cross-mark").classList.add("hidden");
        document.querySelector(".success-checkmark").classList.add("hidden");
        startTyping("");
        setSubtext();
        restore().then(askQuestion);
        return;
      }

      setTimeout(() => {
        document.querySelector(".cross-mark").classList.add("hidden");
        document.querySelector(".success-checkmark").classList.add("hidden");
        startTyping("Placar");
        ShowScore();
        setSubtext();
        setTimeout(() => {
          if (gameSettings.autoplay) {
            restore();
            askQuestion();
          } else {
            canProceed = true;
            setSubtext(
              'Pressione <span class="text-red-600">A</span> para continuar'
            );
          }
        }, 3000);
      }, 3000);
    });
  } else {
    document.querySelector(".cross-mark").classList.remove("hidden");
    startTyping("Resposta Incorreta!");

    setSubtext(CurrentQuestion[number - 1]);

    incorrect.play();
    setTimeout(() => {
      if (gameSettings.repassar && CanRepassar === true) {
        CanRepassar = false;
        document.querySelector(".cross-mark").classList.add("hidden");
        document.querySelector(".success-checkmark").classList.add("hidden");
        startTyping("Repassa!");
        setSubtext();
        restore();
        setTimeout(() => {
          askQuestion(true);

          setTimeout(() => {
            if (Scoreboard.Selected === 1) redSelect();
            else blueSelect();
          }, 1500);
        }, 1500);
      } else {
        document.querySelector(".cross-mark").classList.add("hidden");
        document.querySelector(".success-checkmark").classList.add("hidden");
        if (settings.modoMisterio) {
          CurrentQuestionNumber++;
          CanRepassar = true;
          startTyping("");
          setSubtext();
          restore().then(askQuestion);
          return;
        }
        startTyping("Placar");
        ShowScore();
        setSubtext();
        setTimeout(() => {
          if (gameSettings.autoplay) {
            restore();
            askQuestion();
          } else {
            canProceed = true;
            setSubtext(
              'Pressione <span class="text-red-600">A</span> para continuar'
            );
          }
        }, 3000);
      }
    }, 3000);
  }
}
bindKey("A", () => {
  if (canProceed) {
    canProceed = false;
    restore();
    setSubtext();
    CurrentQuestionNumber++;
    CanRepassar = true;
    askQuestion();
  }
});

function addOne(type) {
  if (type) Scoreboard.Red++;
  else Scoreboard.Blue++;
  document.getElementById("red-score").textContent = Scoreboard.Red;
  document.getElementById("blue-score").textContent = Scoreboard.Blue;
  var moneyAnimation = document.createElement("p");
  moneyAnimation.innerHTML = "+1";
  if (type) document.getElementById("red-score").appendChild(moneyAnimation);
  else document.getElementById("blue-score").appendChild(moneyAnimation);
  moneyAnimation.classList.add("moneyAnimation");
}

[1, 2, 3, 4].forEach((number) => {
  bindKey(number.toString(), () => AnswerQuestion(number));
});

winModal = () => {
  document.querySelector(".cross-mark").classList.add("hidden");
  document.querySelector(".success-checkmark").classList.add("hidden");

  setSubtext();
  setTimeout(() => {
    startTyping("O vencedor é...").then(() => {
      if (settings.semPlacar) {
        return startTyping("O placar foi desativado.");
      }
      const ShowWinner = () => {
        ShowScore();
        if (Scoreboard.Blue > Scoreboard.Red) {
          startTyping(gameSettings.name1 || "Unknown");
          document.getElementById("crown").classList.remove("hidden");
          setSubtext("Parabéns!");
          shotconfetti();
          win.play();
        } else if (Scoreboard.Red > Scoreboard.Blue) {
          startTyping(gameSettings.name2 || "Unknown");
          document.getElementById("crown").classList.remove("hidden");
          setSubtext("Parabéns!");
          shotconfetti();
          win.play();
        } else {
          startTyping("Empate!");
          setSubtext("Whoops!");
        }
        suspense.removeEventListener("ended", ShowWinner);
      };

      suspense.addEventListener("ended", ShowWinner);
      suspense.play();
    });
  }, 1500);
};
