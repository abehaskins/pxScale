var ref = new Firebase("bucket.firebaseio.com/pxScale");

ref.child("status").on("value", function (snapshot) {
	$("#status").text(snapshot.val().web);
});

$(document).ready(function () {
	$("#go").click(function () {
		var scale = $("#scale").val(),
		url = $("#url").val();
		document.location = "/x" + scale + "/" + url;
	});
});