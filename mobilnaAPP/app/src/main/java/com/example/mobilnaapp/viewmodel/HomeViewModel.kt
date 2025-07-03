package com.example.mobilnaapp.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.LiveData
import com.example.mobilnaapp.data.model.Pjesma
import com.example.mobilnaapp.data.remote.ApiService
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class HomeViewModel : ViewModel() {
    private val _pjesme = MutableLiveData<List<Pjesma>>(emptyList())
    val pjesme: LiveData<List<Pjesma>> = _pjesme

    private val api: ApiService = Retrofit.Builder()
        .baseUrl("https://aggregate-ajay-decibel1234-bdb02db8.koyeb.app/api/")
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ApiService::class.java)

    fun fetchPjesme() {
        viewModelScope.launch {
            try {
                val result = api.getPjesme()
                _pjesme.value = result
            } catch (e: Exception) {
                _pjesme.value = emptyList()
            }
        }
    }
}
