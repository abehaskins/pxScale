var ref = new Firebase("bucket.firebaseio.com/pxScale");

ref.child("status").on("value", function (snapshot) {
	$("#statusWeb").text(snapshot.val().web);
	$("#statusWorker").text(snapshot.val().worker);
});


$(document).ready(function () {
	$("#go").click(function () {
		var scale = $("#scale").val(),
		url = $("#url").val();
		document.location = "/x" + scale + "/" + url;
	});
});