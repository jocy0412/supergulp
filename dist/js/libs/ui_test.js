$(function(){

	// 케이스리뷰
	$(".case_view a").on("click",function(){
		var target = $(this);
		if( !target.hasClass('page') ){
			$('html').addClass('no_scr');
			var classNum = $(this).attr("class").replace(/[^0-9]/g,"");
			$(".dimmed").show();
			$(".dimmed").nextAll("div:not(.case_view)").hide();
			$(".dimmed").nextAll("div").eq(classNum-1).show();

			if($(this).hasClass('case_fix')) {
				$('html').addClass('no_scr');
				$(".dimmed").nextAll("div").eq(classNum-1).children().show();			
			}
		}else{
			$('html').removeClass('no_scr');
		}
	});


	// 레이어팝업
	$(".pop_cont .btn, .pop_btn_close").on("click",function(){
		$(".dimmed").hide();
		$(".dimmed").nextAll("div:not(.case_view)").hide();
		$('html').removeClass('no_scr');
	});
	if ( location.hash ) {
		var classNum = location.hash.replace(/[^0-9]/g,"");
		$(".dimmed").show();
		$(".dimmed").nextAll("div").eq(classNum-1).show();
	}

	// 알림장 이미지뷰 레이어팝업
	$(".gallery_viewer .btn_close").on("click",function(){
		$(".dimmed, .gallery_viewer").hide();
	});
	
	// 대시보드 datepicker
	$("#schl_name").each(function(){$(this).datepicker()});
	
	// 출결현황 datepicker
	if($('.btn_calendar').length > 0){
	$('.btn_calendar').datepicker();
	}

	// 청구 datepicker
	$(".btn_calendar_view").each(function(){
		$(this).parent().find("input").datepicker({
			dateFormat : "yy-mm-dd",
			showButtonPanel: true
		});
	});
	$(".btn_calendar_view").on("click",function(e) {
		if(e.clientX > 0 || e.clientY > 0){
			var visible = $("#ui-datepicker-div").is(":visible");
			$(this).datepicker(visible ? "hide" : "show");
				return false;
		}
		return false;
	});

	// 체크박스
	$(".check").on("click",function(){
		$(this).toggleClass("on");

		var checkBox = $(this).find("input");
		var onHasClass = $(this).hasClass("on");

		if(onHasClass){
			checkBox.attr("checked", "checked");
		}else{
			checkBox.attr("checked", null);
		}
	});
	
	//select
	$('[class^="selct_bx_cont"] [class^="selct_area"], .th_wrap .btn_th_arrow').bind('click',function(e){
		e.preventDefault();
		$(this).next().toggle();
	});

	// 약관 펼치기/접기
	$('.view_toggle').on('click', function (e) {
		e.preventDefault();
		var $this = $(this);
		$this.parent().toggleClass('is_folding');
		( $this.text() == '펼치기' ) ? $this.text('접기') : $this.text('펼치기');
	});
});