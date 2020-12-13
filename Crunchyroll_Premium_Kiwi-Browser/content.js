var HTML = document.documentElement.innerHTML;
var width = 0;

//function que pega algo dentro dentro do html.
function pegaString(str, first_character, last_character) {
	if(str.match(first_character + "(.*)" + last_character) == null){
		return null;
	}else{
	    new_str = str.match(first_character + "(.*)" + last_character)[1].trim()
	    return(new_str)
    }
}

//function que optimiza a pagina para dispositivos mobile.
function optimize_for_mobile() {

		console.log("[CR Premium] Optimizando página para mobile...");
		//Verifica quantos videos do slider cabem na tela.
		width = document.body.offsetWidth;
		var carousel_move_times = 0;
		var carousel_videos_count = 0;
		var carousel_arrow_limit = 0;

		switch (true) {
			case (width < 622 && width > 506):
				carousel_move_times = 4;
				break;
			case (width < 506 && width > 390):
				carousel_move_times = 3;
				break;
			case (width < 390 && width > 274):
				carousel_move_times = 2;
				break;
			case (width < 274 && width > 0):
				carousel_move_times = 1;
				break;
			default:
				carousel_move_times = 5;
		}
		//Verifica quantos videos tem no slider
		function getChildNodes(node) {
		    var children = new Array();
		    for(var child in node.childNodes) {
		        if(node.childNodes[child].nodeName == "DIV" && node.childNodes[child].attributes.media_id != null) {
		            children.push(child);
		        }
		    }
		    return children;
		}
		carousel_videos_count = getChildNodes(document.body.querySelector('div.collection-carousel-scrollable'));

		//Pega o script (pq ele fica mudando ai tem q pegar dnv sempre)
		var carousel_arrow_limit = Number(pegaString(
			document.body.querySelector('div.white-wrapper.container-shadow.large-margin-bottom').childNodes[3].innerHTML
			, "Math.min", ","
		).replace("(", ""));

		var carousel_script = document.body.querySelector('div.white-wrapper.container-shadow.large-margin-bottom').childNodes[3].innerText
		.replace(".data()['first_visible'] - 5", ".data()['first_visible'] - " + carousel_move_times)
		.replace(".data()['first_visible'] + 5", ".data()['first_visible'] + " + carousel_move_times)
		.replace("Math.min(" + carousel_arrow_limit + ",", "Math.min(" + (carousel_videos_count.length - carousel_move_times) + ",")
		.replace(".data()['first_visible'] < " + carousel_arrow_limit, ".data()['first_visible'] < " + (carousel_videos_count.length - carousel_move_times))
		.replace(".data()['first_visible'] >= " + carousel_arrow_limit, ".data()['first_visible'] >= " + (carousel_videos_count.length - carousel_move_times))
		.replace(".data()['first_visible'] >= " + carousel_arrow_limit, ".data()['first_visible'] >= " + (carousel_videos_count.length - carousel_move_times));

		//console.log("carousel_script = " + carousel_script);
		//console.log("carousel_move_times = " + carousel_move_times);
		//console.log("carousel_videos_count = " + carousel_videos_count.length);
		//console.log("carousel_arrow_limit = " + carousel_arrow_limit);

		//Remove o script dos botoes atuais, para remover a função antiga ao clicar.
		var old_element = document.querySelector(".collection-carousel-leftarrow");
		var new_element = old_element.cloneNode(true);
		old_element.parentNode.replaceChild(new_element, old_element);

		var old_element = document.querySelector(".collection-carousel-rightarrow");
		var new_element = old_element.cloneNode(true);
		old_element.parentNode.replaceChild(new_element, old_element);

		//Adiciona o script modificado.
		var head = document.getElementsByTagName('head')[0];
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.onload = function() {
		    callFunctionFromScript();
		}
		script.text = carousel_script;
		head.appendChild(script);

		//Deixa o video pequeno denovo no primeiro episodio.
		if(document.getElementById('showmedia_video_box_wide') != null) {
			document.getElementById('showmedia_video_box_wide').id = 'showmedia_video_box';
		}

		//Desbuga a seta de avançar o slider.
		if(document.body.querySelector('div.collection-carousel-scrollable').lastElementChild.childNodes[1] != undefined) {
			if(document.body.querySelector('div.collection-carousel-scrollable').lastElementChild.childNodes[1].classList.value.indexOf('collection-carousel-media-link-current') == -1) {
				if(carousel_move_times == 4) {
					if(document.body.querySelector('div.collection-carousel-scrollable').lastElementChild.previousElementSibling.childNodes[1].classList.value.indexOf('collection-carousel-media-link-current') == -1) {
						document.body.querySelector('a.collection-carousel-rightarrow').classList = "collection-carousel-arrow collection-carousel-rightarrow";
					}
				}else{
					document.body.querySelector('a.collection-carousel-rightarrow').classList = "collection-carousel-arrow collection-carousel-rightarrow";
				}
			}else{
				if(carousel_move_times == 2){
					document.body.querySelector('a.collection-carousel-rightarrow').classList = "collection-carousel-arrow collection-carousel-rightarrow";
				}
			}
		}
}

//function que mudar o player para um mais simples.
function importPlayer() {

		//Remove o player do Crunchyroll.
		console.log("[CR Premium] Removendo player da Crunchyroll...");
		var elem = document.getElementById('showmedia_video_player');
    	elem.parentNode.removeChild(elem);

    	//Pega os dados de stream da variavel presente no html.
		console.log("[CR Premium] Pegando dados da stream...");
		var video_config_media = JSON.parse(pegaString(HTML, "vilos.config.media = ", ";"));

		//Adiciona o iframe com o jwplayer
    	console.log("[CR Premium] Adicionando o jwplayer...");
    	ifrm = document.createElement("iframe");
    	ifrm.setAttribute("id", "frame"); 
		ifrm.setAttribute("src", "https://luiz-lp.github.io/crpiframeplayer/"); 
		ifrm.setAttribute("width","100%");
		ifrm.setAttribute("height","100%");
		ifrm.setAttribute("frameborder","0");
		ifrm.setAttribute("scrolling","no");
		ifrm.setAttribute("allowfullscreen","allowfullscreen");
		ifrm.setAttribute("allow","autoplay; encrypted-media *");

		//Remove avisos q o video não pode ser visto.
		if(document.body.querySelector("#showmedia_video_box") != null){
			document.body.querySelector("#showmedia_video_box").appendChild(ifrm);
		}else{
			document.body.querySelector("#showmedia_video_box_wide").appendChild(ifrm);
		}

		if(document.body.querySelector(".showmedia-trailer-notice") != null){
			document.body.querySelector(".showmedia-trailer-notice").style.textDecoration = "line-through";
		}
		if(document.body.querySelector("#showmedia_free_trial_signup") != null){
			document.body.querySelector("#showmedia_free_trial_signup").style.display = "none";
		}

		//Ao carregar o iframe, manda uma mensagem para o iframe com os dados da stream.
		ifrm.onload = function(){
			ifrm.contentWindow.postMessage({
           		'video_config_media': [JSON.stringify(video_config_media)],
           		'lang': [pegaString(HTML, 'LOCALE = "', '",')]
        	},"*");
	    };

		console.log(video_config_media);

		//Ao terminar de modificar a pagina, verifica se é mobile e optimiza a pagina.
		if(width < 796) {
			optimize_for_mobile();
		}
}
//function ao carregar pagina.
function onloadfunction() {
	//Se estiver na página que pede app, redireciona para home.
    if(window.location.href == "https://www.crunchyroll.com/interstitial/android") {
       	window.location.href = "https://www.crunchyroll.com/interstitial/android?skip=1";
    }

	//Adicionando metaTag para poder optimizar para o mobile.
	var metaTag = document.createElement('meta');
	metaTag.name = "viewport"
	metaTag.content = "width=device-width, initial-scale=1.0, shrink-to-fit=no, user-scalable=no"
	document.getElementsByTagName('head')[0].appendChild(metaTag);

	//Vai para topo da página.
	window.scrollTo(0, 0);

	if(pegaString(HTML, "vilos.config.media = ", ";") != null){
		importPlayer();
	}
}
document.addEventListener("DOMContentLoaded", onloadfunction());