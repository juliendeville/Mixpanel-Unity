﻿import System;
import System.Collections.Generic;
import System.Text;
import LitJson;

public static class Mixpanel
{
	// Set this to your Mixpanel token.
	public var Token : String;

	// Set this to the distinct ID of the current user.
	public var DistinctID : String;

	// Set to true to enable debug logging.
	public var EnableLogging : boolean;

	// Add any custom "super properties" to this dictionary. These are properties sent with every event.
	public var SuperProperties = new Dictionary.<String, Object>();

	private var API_URL_FORMAT = "http://api.mixpanel.com/track/?data={0}";
	private var _coroutineObject : MonoBehaviour;

	// Call this to send an event to Mixpanel.
	// eventName: The name of the event. (Can be anything you'd like.)
	public function SendEvent(eventName : String)
	{
		SendEvent(eventName, null);
	}

	// Call this to send an event to Mixpanel.
	// eventName: The name of the event. (Can be anything you'd like.)
	// properties: A dictionary containing any properties in addition to those in the Mixpanel.SuperProperties dictionary.
	public function SendEvent(eventName : String, properties : Hashtable)
	{
		var newProps = new Dictionary.<String, Object>();
		for(kvp in properties)
			newProps.Add(kvp.Key, kvp.Value);
		SendEvent(eventName, newProps);
	}

	// Call this to send an event to Mixpanel.
	// eventName: The name of the event. (Can be anything you'd like.)
	// properties: A dictionary containing any properties in addition to those in the Mixpanel.SuperProperties dictionary.
	public function SendEvent(eventName : String, properties : IDictionary.<String, Object>)
	{
		if(String.IsNullOrEmpty(Token))
		{
			Debug.LogError("Attempted to send an event without setting the Mixpanel.Token variable.");
			return;
		}

		if(String.IsNullOrEmpty(DistinctID))
		{
			if(!PlayerPrefs.HasKey("mixpanel_distinct_id"))
				PlayerPrefs.SetString("mixpanel_distinct_id", Guid.NewGuid().ToString());
			DistinctID = PlayerPrefs.GetString("mixpanel_distinct_id");
		}

		var propsDict = new Dictionary.<String, Object>();
		propsDict.Add("distinct_id", DistinctID);
		propsDict.Add("token", Token);
		for(var kvp in SuperProperties)
		{
			if(kvp.Value instanceof Single) // LitJSON doesn't support floats.
			{
				var s : Single = kvp.Value;
				var d : Double = s;
				propsDict.Add(kvp.Key, d);
			}
			else
				propsDict.Add(kvp.Key, kvp.Value);
		}
		if(properties != null)
		{
			for(var kvp in properties)
			{
				if(kvp.Value instanceof Single) // LitJSON doesn't support floats.
				{
					s = kvp.Value;
					d = s;
					propsDict.Add(kvp.Key, d);
				}
				else
					propsDict.Add(kvp.Key, kvp.Value);
			}
		}
		var jsonDict = new Dictionary.<String, Object>();
		jsonDict.Add("event", eventName);
		jsonDict.Add("properties", propsDict);
		var jsonStr = JsonMapper.ToJson(jsonDict);
		if(EnableLogging)
			Debug.Log("Sending mixpanel event: " + jsonStr);
		var jsonStr64 = EncodeTo64(jsonStr);
		var url = String.Format(API_URL_FORMAT, jsonStr64);
		StartCoroutine(SendEventCoroutine(url));
	}

	private function EncodeTo64(toEncode : String) : String
	{
		var toEncodeAsBytes = Encoding.ASCII.GetBytes(toEncode);
		var returnValue = Convert.ToBase64String(toEncodeAsBytes);
		return returnValue;
	}

	private function StartCoroutine(coroutine : IEnumerator)
	{
		if(_coroutineObject == null)
		{
			var go = new GameObject("Mixpanel Coroutines");
			UnityEngine.Object.DontDestroyOnLoad(go);
			_coroutineObject = go.AddComponent.<MonoBehaviour>();
		}

		_coroutineObject.StartCoroutine(coroutine);
	}

	private function SendEventCoroutine(url : String) : IEnumerator
	{
		var www = new WWW(url);
		yield www;
		if(www.error != null)
			Debug.LogWarning("Error sending mixpanel event: " + www.error);
		else if(www.text.Trim() == "0")
			Debug.LogWarning("Error on mixpanel processing event: " + www.text);
		else if(EnableLogging)
			Debug.Log("Mixpanel processed event: " + www.text);
	}
}