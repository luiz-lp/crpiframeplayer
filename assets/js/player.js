window.addEventListener("message", async e => {

	// Meta para testar o player APENAS em localhost
	if (window.location.href == "http://127.0.0.1:5500/") {
		let meta = document.createElement('meta');
		meta.httpEquiv = "Content-Security-Policy";
		meta.content = "upgrade-insecure-requests";
		document.getElementsByTagName('head')[0].appendChild(meta);
	}

	console.log('[CR Premium] Player encontrado!')

	// Variáveis principais
	const promises=[], request = [], s = [];
	const r = { 0: '720p', 1: '1080p', 2: '480p', 3: '360p', 4: '240p' };
	for (let i in r) promises[i] = new Promise((resolve, reject) => request[i] = { resolve, reject });

	let rgx = /http.*$/gm;
	let streamrgx = /_,(\d+.mp4),(\d+.mp4),(\d+.mp4),(\d+.mp4),(\d+.mp4),.*?m3u8/;
	let video_config_media = JSON.parse(e.data.video_config_media);
	let allorigins = "https://crp-proxy.herokuapp.com/get?url=";
	let video_id = video_config_media['metadata']['id'];
	let user_lang = e.data.lang;
	let episode_translate = "";
	let video_stream_url = "";
	let video_m3u8_array = [];
	let video_mp4_array = [];
	let episode_title = "";
	let rows_number = 0;
	let sources = [];

	// Obter streams
	for (let stream of video_config_media['streams']) {
		// Premium
		if (stream.format == 'trailer_hls' && stream.hardsub_lang == user_lang)
			if (rows_number <= 4) {
				// video_m3u8_array.push(await getDirectStream(stream.url, rows_number));
				video_mp4_array.push(getDirectFile(stream.url));
				rows_number++;
				// mp4 + resolve temporario até pegar link direto da m3u8
				if (rows_number > 4) {
					video_m3u8_array = video_mp4_array;
					for (let i in r) {
						const idx = i;
						setTimeout(() => request[idx].resolve(), 200);
					}
					break;
				}
			}
		// Padrão
		if (stream.format == 'adaptive_hls' && stream.hardsub_lang == user_lang) {
			video_stream_url = stream.url;
			video_m3u8_array = await m3u8ListFromStream(video_stream_url);
			video_mp4_array = mp4ListFromStream(video_stream_url);
			break;
		}
	}

	// Pega o numero e titulo do episodio
	const epLangs = { "ptBR": "Episódio", "enUS": "Episode", "enGB": "Episode", "esLA": "Episodio", "esES": "Episodio", "ptPT": "Episódio", "frFR": "Épisode", "deDE": "Folge", "arME": "الحلقة", "itIT": "Episodio", "ruRU": "Серия" };
	const fnLangs = { "ptBR": "FINAL", "enUS": "FINAL", "enGB": "FINAL", "esLA": "FINAL", "esES": "FINAL", "ptPT": "FINAL", "frFR": "FINALE", "deDE": "FINALE", "arME": "نهائي", "itIT": "FINALE", "ruRU": "ФИНАЛЬНЫЙ" };
	episode_translate = `${epLangs[user_lang[0]] ? epLangs[user_lang[0]] : "Episode"} `;
	final_translate   = ` (${fnLangs[user_lang[0]] ? fnLangs[user_lang[0]] : "FINAL"})`;

	if (video_config_media['metadata']['up_next']) {
		let prox_ep_number = video_config_media['metadata']['up_next']['display_episode_number'];
		episode_title = video_config_media['metadata']['up_next']['series_title'] + ' - ' + prox_ep_number.replace(/\d+/g, '') + video_config_media['metadata']['display_episode_number'];
	} else
		episode_title = episode_translate + video_config_media['metadata']['display_episode_number'] + final_translate;

	// Checa se o URL do video_mp4_array[id] existe e calcula o tamanho p/ download
	function linkDownload(id) {
		console.log('  - Baixando: ', r[id])
		let video_mp4_url = video_mp4_array[id];

		let fileSize = "";
		let http = (window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"));
		http.onreadystatechange = () => {
			if (http.readyState == 4 && http.status == 200) {
				fileSize = http.getResponseHeader('content-length');
				if (!fileSize && !needs_proxy)
					return setTimeout(() => linkDownload(id), 5000);
				else {
					let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
					if (fileSize == 0) return console.log('addSource#fileSize == 0');
					let i = parseInt(Math.floor(Math.log(fileSize) / Math.log(1024)));
					if (i == 0) return console.log('addSource#i == 0');
					let return_fileSize = (fileSize / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
					s[id] = return_fileSize;
					document.getElementById(r[id] + "_down_size").innerText = s[id];
					return console.log(`[CR Premium] Source adicionado: ${r[id]} (${return_fileSize})`);
				}
			} else if (http.readyState == 4)
				return setTimeout(() => linkDownload(id), 5000);
		}
		http.open("HEAD", video_mp4_url, true);
		http.send();
	}

	// Carregar player assim que encontrar as URLs dos m3u8.
	Promise.all(promises).then(() => {
		for (let idx of [1, 0, 2, 3, 4])
			sources.push({ file: video_m3u8_array[idx], label: r[idx] + (idx<2 ? '<sup><sup>HD</sup></sup>' : '')});
		startPlayer();
	});

	function startPlayer() {
		// Inicia o player
		let playerInstance = jwplayer("player_div")
		playerInstance.setup({
			"title": episode_title,
			"description": video_config_media['metadata']['title'],
			"sources": sources,
			"image": video_config_media['thumbnail']['url'],
			"width": "100%",
			"height": "100%",
			"autostart": false,
			"displayPlaybackLabel": true,
			"primary": "html5"
		});

		// Variaveis para o botao de baixar.
		let button_iconPath = "assets/icon/download_icon.svg";
		let buttonId = "download-video-button";
		let button_tooltipText = "Download";
		let didDownload = false;

		// funcion ao clicar no botao de fechar o menu de download
		const downloadModal = document.querySelectorAll(".modal")[0];
		document.querySelectorAll("button.close-modal")[0].onclick = () =>
			downloadModal.style.visibility = "hidden";

		// function ao clicar no botao de baixar
		function download_ButtonClickAction() {
			// Se estiver no mobile, muda um pouco o design do menu
			if (jwplayer().getEnvironment().OS.mobile == true) {
				downloadModal.style.height = "170px";
				downloadModal.style.overflow = "auto";
			}
			
			// Mostra o menu de download
			downloadModal.style.visibility = downloadModal.style.visibility === "hidden" ? "visible" : "hidden";
			
			// Carrega os downloads
			if (!didDownload) {
				didDownload = true;
				console.log('[CR Premium] Baixando sources:')
				for (id in r)
					linkDownload(id);
			}
		}
		playerInstance.addButton(button_iconPath, button_tooltipText, download_ButtonClickAction, buttonId);

		// Definir URL e Tamanho na lista de download
		for (let id in r) {
			document.getElementById(r[id] + "_down_url").href = video_mp4_array[id];
			document.getElementById(r[id] + "_down_url").download = video_config_media['metadata']['title'].replaceAll(/[\\/<>\|?*:]+/g, '-').replaceAll('"', "'")
		}

		// Funções para o player
		jwplayer().on('ready', e => {
			// Seta o tempo do video pro salvo no localStorage		
			if (localStorage.getItem(video_id) != null)
				document.getElementsByTagName("video")[0].currentTime = localStorage.getItem(video_id);
			document.body.querySelector(".loading_container").style.display = "none";
		});

		// Mostra uma tela de erro caso a legenda pedida não exista.
		jwplayer().on('error', e => {
			console.log(e)
			if (e.code == 232011) {
				jwplayer().load({
					file: "https://i.imgur.com/OufoM33.mp4"
				});
				jwplayer().setControls(false);
				jwplayer().setConfig({
					repeat: true
				});
				jwplayer().play();
			}
		});
		
		// Fica salvando o tempo do video a cada 5 segundos.
		setInterval(() => {
			if (jwplayer().getState() == "playing")
				localStorage.setItem(video_id, jwplayer().getPosition());
		}, 5000);
	}

	/* ~~~~~~~~~~ FUNÇÕES ~~~~~~~~~~ */
	function getAllOrigins(url) {
		return new Promise(async (resolve, reject) => {
			await $.ajax({
				async: true,
				type: "GET",
				url: allorigins + encodeURIComponent(url),
				responseType: 'json'
			})
			.then(res=>{
				resolve(res.contents)
			})
			.catch(err=>reject(err));
		})
	}

	// ---- MP4 ---- (baixar)
	// Obtem o link direto pelo trailer
	function getDirectFile(url) {
		return url.replace(/\/clipFrom.*?index.m3u8/, '').replace('_,', '_').replace(url.split("/")[2], "fy.v.vrv.co");
	}

	// Obtem o link direto pelo padrão
	function mp4ListFromStream(url) {
		const cleanUrl = url.replace('evs1', 'evs').replace(url.split("/")[2], "fy.v.vrv.co");
		const res = [];
		for (let i in r)
			res.push(cleanUrl.replace(streamrgx, `_$${(parseInt(i)+1)}`))
		return res;
	}

	// ---- M3U8 ---- (assistir)
	// Obtem o link direto pelo trailer
	function getDirectStream(url, idx) {
		setTimeout(() => request[idx].resolve(), 200);
	}

	// Obtem o link direto pelo padrão
	async function m3u8ListFromStream(url) {
		let m3u8list = []
		const master_m3u8 = await getAllOrigins(url);

		if (master_m3u8) {
			streams = master_m3u8.match(rgx)
			m3u8list = streams.filter((el, idx) => idx%2===0) // %2 === 0 pois há cdns da akamai e da cloudflare
		} else {
			for (let i in r) {
				const idx = i;
				setTimeout(() => request[idx].reject('Manifest m3u8ListFromStream#master_m3u8.length === 0'), 200);
			}
			return [];
		}

		const res = [];
		for (let i in m3u8list) {
			const video_m3u8 = await getAllOrigins(m3u8list[i]);
			m3u8list[i] = blobStream(video_m3u8);
		}
		
		res.push(buildM3u8(m3u8list));
		for (let i in r) {
			const idx = i;
			setTimeout(() => request[idx].resolve(), 200);
		}

		return res;
	}

	function blobStream(stream) {
		const blob = new Blob([stream], {
			type: "text/plain; charset=utf-8"
		});
		return URL.createObjectURL(blob) + "#.m3u8";
	}

	function buildM3u8(m3u8list) {
		const video_m3u8 = '#EXTM3U' +
		'\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=4112345,RESOLUTION=1280x720,FRAME-RATE=23.974,CODECS="avc1.640028,mp4a.40.2"' +
		'\n' + m3u8list[0] +
		'\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=8098235,RESOLUTION=1920x1080,FRAME-RATE=23.974,CODECS="avc1.640028,mp4a.40.2"' +
		'\n' + m3u8list[1] +
		'\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2087088,RESOLUTION=848x480,FRAME-RATE=23.974,CODECS="avc1.4d401f,mp4a.40.2"' +
		'\n' + m3u8list[2] +
		'\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1090461,RESOLUTION=640x360,FRAME-RATE=23.974,CODECS="avc1.4d401e,mp4a.40.2"' +
		'\n' + m3u8list[3] +
		'\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=559942,RESOLUTION=428x240,FRAME-RATE=23.974,CODECS="avc1.42c015,mp4a.40.2"' +
		'\n' + m3u8list[4];
		return blobStream(video_m3u8);
	}
});
